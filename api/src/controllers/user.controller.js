const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');
const database = require('../util/db.util');
const { resync } = require('../util/db.util');
const myfs = require('../util/fs.util');
const time = require('../util/time.util');

const { STORAGE, SERVER, UI, DETECTORS } = require('../constants')();
// const DETECTORS = require('../constants/config').detectors();
// const { BAD_REQUEST } = require('../constants/http-status');
const train = require('../util/train.util');

// const actions = require('../util/detectors/actions');

const { DEEPSTACK } = DETECTORS || {};

module.exports.getall = async (req, res) => {
  const db = database.connect();

  const users = db.prepare('SELECT * FROM user').all();
  res.send({
    users,
  });
};

module.exports.delete = async (req, res) => {
  const { names } = req.body;
  for (const name of names) {
    if (fs.existsSync(`${STORAGE.MEDIA.PATH}/train/${name}`)) {
      fs.rmSync(`${STORAGE.MEDIA.PATH}/train/${name}`, { recursive: true });
      await resync.files();
    }
    const db = database.connect();
    db.prepare('DELETE FROM file WHERE name = ?').run(name);
    await train.remove(name);
    db.prepare('DELETE FROM train WHERE name = ?').run(name);
    db.prepare('DELETE FROM user WHERE name = ?').run(name);
  }

  res.send({ success: true });
};

module.exports.add = async (req, res) => {
  const { name, staffNum, department } = req.body.data;
  // if (!fs.existsSync(`${STORAGE.MEDIA.PATH}/train/${name}`)) {
  //   fs.mkdirSync(`${STORAGE.MEDIA.PATH}/train/${name}`);
  // }
  const db = database.connect();
  try {
    db.prepare('INSERT INTO user (name, staffNum, department) VALUES (?, ?, ?)').run(
      name,
      staffNum,
      department
    );
    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

module.exports.trainUserImg = async (req, res) => {
  const { name } = req.params;
  const files = [];

  if (req.files) {
    await Promise.all(
      req.files.map(async (obj) => {
        const { originalname, buffer, mimetype } = obj;
        if (!['image/jpeg', 'image/png'].includes(mimetype)) {
          console.warn(`training incorrect mime type: ${mimetype}`);
          return;
        }
        const ext = `.${originalname.split('.').pop()}`;
        const filename = `${originalname.replace(ext, '')}-${time.unix()}${ext}`;
        await myfs.writer(`${STORAGE.MEDIA.PATH}/train/${name}/${filename}`, buffer);
        files.push({ name, filename });
      })
    );
  }
  if (files.length) {
    await train.add(name, { files });
    res.send({ success: true });
  } else {
    res.send({ success: false });
  }
};

module.exports.timeline = async (req, res) => {
  const { username, range } = req.query;
  const db = database.connect();
  let data = [];
  if (!range) {
    data = db
      .prepare(
        `SELECT match.*
        FROM match
        JOIN (
            SELECT m.id
            FROM match m,
            json_each(m.response) r,
            json_each(json_extract(r.value, '$.results')) res
            WHERE json_extract(res.value, '$.name') = ?
        ) filtered ON match.id = filtered.id
        ORDER BY match.createdAt DESC`
      )
      .all(username);
  } else {
    const currentDate = new Date();
    const daysAgo = new Date();
    daysAgo.setDate(currentDate.getDate() - range);

    const computedDate = daysAgo.toISOString().split('T')[0];

    data = db
      .prepare(
        `SELECT match.*
        FROM match
        JOIN (
            SELECT m.id
            FROM match m,
            json_each(m.response) r,
            json_each(json_extract(r.value, '$.results')) res
            WHERE json_extract(res.value, '$.name') = ?
        ) filtered ON match.id = filtered.id
        WHERE date(match.createdAt) BETWEEN date(?) AND date('now','utc')
        ORDER BY match.createdAt DESC`
      )
      .all(username, computedDate);
  }

  res.send({ timelines: data });
};

module.exports.checkfaceagain = async (req, res) => {
  try {
    const db = database.connect();
    const matches = db
      .prepare(
        `SELECT *
      FROM match
      WHERE EXISTS (
          SELECT 1
          FROM json_each(match.response) r,
              json_each(json_extract(r.value, '$.results')) res
          WHERE json_extract(res.value, '$.name') = 'unknown'
      )
      AND match.createdAt >= datetime('now', '-3 days')`
      )
      .all();
    const results = [];
    for (const match of matches) {
      // const { id, filename, event, response } = match;
      // const { camera } = event;
      // const filepath = `${STORAGE.MEDsIA.PATH}/matches/${filename}`;
      // const dtype = DETECTORS[0];
      // // const resp = await axios({
      // //   method: 'get',
      // //   url: `http://0.0.0.0:${SERVER.PORT}${UI.PATH}/api/checkunknowbydetectors`,
      // //   // headers: AUTH ? { authorization: jwt.sign({ route: 'recognize' }) } : null,
      // //   params: {
      // //     url: `http://0.0.0.0:${SERVER.PORT}${UI.PATH}/api/matches/${filename}`,
      // //     camera,
      // //     detector_type: DETECTORS[0],
      // //   },
      // //   validateStatus: () => true,
      // // });
      // const { data } = await actions.recognize({ dtype, key: filepath });
      // const { predictions } = data;
      // for (let i = 0; i < predictions.length; i++) {
      //   if (response.results[i].name === 'unknown') {
      //     response.results[i].name = predictions[i].userid;
      //   }
      // }
      const { id } = match;
      const { data } = await axios({
        method: 'patch',
        url: `http://0.0.0.0:${SERVER.PORT}${UI.PATH}/api/match/reprocess/${id}`,
      });
      results.push(data);
    }
    res.send({ results });
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

module.exports.comparetwofaces = async (req, res) => {
  const { URL } = DEEPSTACK;
  const { fn, dates } = req.body;
  const formattedDates = dates.map((date) => {
    const dateObj = new Date(date);
    const result = dateObj.toISOString().split('T')[0];
    return result;
  });
  const uploadedImgStream = fs.createReadStream(`${STORAGE.TMP.PATH}/${fn}`);
  try {
    const db = database.connect();
    const matches = db
      .prepare(
        `SELECT * FROM match
        WHERE date(match.createdAt) BETWEEN date(?) AND date(?)
        ORDER BY match.createdAt DESC`
      )
      .bind(formattedDates[0], formattedDates[1])
      .all();
    // const ids = (
    //   await Promise.all(
    //     matches.map(async (match) => {
    //       const filepath = `${STORAGE.MEDIA.PATH}/matches/${match.filename}`;
    //       const matchImgStream = fs.createReadStream(filepath);

    //       const formData = new FormData();
    //       formData.append('image1', uploadedImgStream);
    //       formData.append('image2', matchImgStream);

    //       const { data } = await axios({
    //         method: 'post',
    //         url: `${URL}/v1/vision/face/match`,
    //         headers: {
    //           ...formData.getHeaders(),
    //         },
    //         data: formData,
    //       });

    //       return data.similarity > 0.7 ? match.id : null;
    //     })
    //   )
    // ).filter((id) => id !== null);

    const results = await Promise.allSettled(
      matches.map(async (match) => {
        try {
          const filepath = `${STORAGE.MEDIA.PATH}/matches/${match.filename}`;
          const matchImgStream = fs.createReadStream(filepath);

          const formData = new FormData();
          formData.append('image1', uploadedImgStream);
          formData.append('image2', matchImgStream);

          const { data } = await axios({
            method: 'post',
            url: `${URL}/v1/vision/face/match`,
            headers: {
              ...formData.getHeaders(),
            },
            data: formData,
          });

          return data.similarity > 0.7 ? match.id : null;
        } catch (error) {
          console.error('Error processing match:', error.message);
          return null;
        }
      })
    );

    // Filter out null values and get IDs
    const ids = results
      .filter((result) => result.status === 'fulfilled' && result.value !== null)
      .map((result) => result.value);

    // if (fs.existsSync(`${STORAGE.TMP.PATH}/${fn}`)) {
    //   fs.unlinkSync(`${STORAGE.TMP.PATH}/${fn}`);
    // }
    res.send({ ids });
  } catch (error) {
    console.error(error);
    res.send({ success: false });
  }
};

module.exports.savetmpimg = async (req, res) => {
  const { buffer } = req.file;
  const filename = `${uuidv4()}.jpg`;
  myfs.writer(`${STORAGE.TMP.PATH}/${filename}`, buffer);
  res.send({ filename });
};

module.exports.updateuser = async (req, res) => {
  const { id, staffNum, department } = req.body.data;
  const db = database.connect();
  db.prepare(
    ` UPDATE user
      SET staffNum = ?, department = ?
      WHERE id = ?`
  ).run(staffNum, department, id);
  res.send({ success: true });
};

module.exports.adduserbyxlxs = async (req, res) => {
  // const { postData } = req.body.data;
  const postData = req.body.name.map((item, index) => ({
    name: item,
    staffNum: req.body.staffNum[index],
    department: req.body.department[index],
    img: req.files[index],
  }));
  const db = database.connect();
  await Promise.all(
    postData.map(async (ele) => {
      const { img, name, staffNum, department } = ele;
      if (img) {
        const imgBuffer = img.buffer;
        const buffer = Buffer.from(imgBuffer);
        const filename = `${uuidv4()}.jpg`;
        const files = [];
        try {
          if (!fs.existsSync(`${STORAGE.MEDIA.PATH}/train/${name}`)) {
            fs.mkdirSync(`${STORAGE.MEDIA.PATH}/train/${name}`);
          }
          await myfs.writer(`${STORAGE.MEDIA.PATH}/train/${name}/${filename}`, buffer);
          files.push({ name, filename });
          if (files.length) await train.add(name, { files });
          db.prepare('INSERT INTO user (name, staffNum, department) VALUES (?, ?, ?)').run(
            name,
            staffNum,
            department
          );
        } catch (error) {
          console.log(error);
          // console.error(`create ${name} file failed`);
        }
      }
    })
  ).catch((err) => {
    console.log(err);
    res.send({ success: false });
  });
  res.send({ success: true });
};
