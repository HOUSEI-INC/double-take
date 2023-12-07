const fs = require('fs');
const database = require('../util/db.util');
const { resync } = require('../util/db.util');
const { STORAGE } = require('../constants')();

module.exports.getall = async (req, res) => {
  const db = database.connect();

  const users = db.prepare('SELECT * FROM user').all();
  res.send({
    users,
  });
};

module.exports.delete = async (req, res) => {
  const { names } = req.body;
  console.log(req.body);
  for (const name of names) {
    if (fs.existsSync(`${STORAGE.MEDIA.PATH}/train/${name}`)) {
      fs.rmSync(`${STORAGE.MEDIA.PATH}/train/${name}`, { recursive: true });
      await resync.files();
    }
    const db = database.connect();
    db.prepare('DELETE FROM file WHERE name = ?').run(name);
    db.prepare('DELETE FROM train WHERE name = ?').run(name);
    db.prepare('DELETE FROM user WHERE name = ?').run(name);
  }

  res.send({ success: true });
};

module.exports.add = async (req, res) => {
  const { name } = req.params;
  if (!fs.existsSync(`${STORAGE.MEDIA.PATH}/train/${name}`)) {
    fs.mkdirSync(`${STORAGE.MEDIA.PATH}/train/${name}`);
  }
  const db = database.connect();
  db.prepare('INSERT INTO user (name) VALUES (?)').run(name);
  res.send({ success: true });
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
