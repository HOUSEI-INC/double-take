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
