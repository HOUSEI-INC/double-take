/* eslint-disable */
const fs = require('fs');
const sizeOf = require('probe-image-size');
const database = require('../util/db.util');
const filesystem = require('../util/fs.util');
const { tryParseJSON } = require('../util/validators.util');
const { jwt } = require('../util/auth.util');
const process = require('../util/process.util');
const { AUTH, STORAGE, UI } = require('../constants')();
const { BAD_REQUEST } = require('../constants/http-status');
const DETECTORS = require('../constants/config').detectors();

const format = async (matches) => {
  const token = AUTH && matches.length ? jwt.sign({ route: 'storage' }) : null;
  matches = await Promise.all(
    matches.map(async (obj) => {
      const { id, filename, event, response, isTrained } = obj;
      const { id: eventId, camera, type, zones, updatedAt } = JSON.parse(event);
      const key = `matches/${filename}`;
      const { width, height } = await sizeOf(
        fs.createReadStream(`${STORAGE.MEDIA.PATH}/${key}`)
      ).catch((/* error */) => ({ width: 0, height: 0 }));

      return {
        id,
        eventId,
        camera,
        type,
        zones,
        file: {
          key,
          filename,
          width,
          height,
        },
        isTrained: !!isTrained,
        response: JSON.parse(response),
        createdAt: obj.createdAt,
        updatedAt: updatedAt || null,
        token,
      };
    })
  );
  return matches;
};

module.exports.get = async (req, res) => {
  const limit = UI.PAGINATION.LIMIT;
  const { sinceId, page, matchedIds } = req.query;
  const filters = tryParseJSON(req.query.filters);
  console.log(matchedIds);
  const db = database.connect();

  if (matchedIds) {
    const [total] = db
      .prepare(
        `SELECT COUNT(*) count FROM match
      WHERE id IN (${database.params(matchedIds)})
      AND id > ?
      ORDER BY createdAt DESC`
      )
      .bind(matchedIds, sinceId || 0)
      .all();
    const matches = db
      .prepare(
        `SELECT * FROM match
        LEFT JOIN (SELECT filename as isTrained FROM train GROUP BY filename) train ON train.isTrained = match.filename
        WHERE id IN (${database.params(matchedIds)})
        AND id > ?
        ORDER BY createdAt DESC
        LIMIT ?,?`
      )
      .bind(matchedIds, sinceId || 0, limit * (page - 1), limit)
      .all();
    return res.send({ total: total.count, limit, matches: await format(matches) });
  }

  if (!filters || !Object.keys(filters).length) {
    const [total] = db.prepare(`SELECT COUNT(*) count FROM match`).all();
    const matches = db
      .prepare(
        `SELECT * FROM match
          LEFT JOIN (SELECT filename as isTrained FROM train GROUP BY filename) train ON train.isTrained = match.filename
          ORDER BY createdAt DESC
          LIMIT ?,?`
      )
      .bind(limit * (page - 1), limit)
      .all();

    return res.send({ total: total.count, limit, matches: await format(matches) });
  }

  const startDate = filters.datetime[0] ? new Date(filters.datetime[0]) : null;
  const convertStartDate = startDate?.toISOString() || null;

  const endDate = filters.datetime[1] ? new Date(filters.datetime[1]) : null;
  const convertEndDate = endDate?.toISOString() || null;

  const confidenceQuery =
    filters.confidence === 0 ? `OR json_extract(value, '$.confidence') IS NULL` : '';

  let dateTimeQuery = '';
  let bindings = [
    filters.names,
    filters.matches.map((obj) => (obj === 'match' ? 1 : 0)),
    filters.cameras,
    filters.types,
    filters.confidence,
    filters.width,
    filters.height,
    filters.detectors,
  ];

  if (convertStartDate) {
    dateTimeQuery = ` AND t.createdAt >= ?`;
    bindings.push(convertStartDate);
  } else if (convertEndDate) {
    dateTimeQuery = ` AND t.createdAt BETWEEN ? AND ?`;
    bindings.push(convertEndDate);
  }

  const filteredIds = db
    .prepare(
      `SELECT t.id, t.event, detector, t.createdAt, value FROM (
          SELECT match.id, event, json_extract(value, '$.detector') detector, json_extract(value, '$.results') results, createdAt
          FROM match, json_each( match.response)
        ) t, json_each(t.results)
        WHERE json_extract(value, '$.name') IN (${database.params(filters.names)})
          AND json_extract(value, '$.match') IN (${database.params(filters.matches)})
          AND json_extract(t.event, '$.camera') IN (${database.params(filters.cameras)})
          AND json_extract(t.event, '$.type') IN (${database.params(filters.types)})
          AND (json_extract(value, '$.confidence') >= ? ${confidenceQuery})
          AND json_extract(value, '$.box.width') >= ?
          AND json_extract(value, '$.box.height') >= ?
          AND detector IN (${database.params(filters.detectors)})
          ${dateTimeQuery}
        GROUP BY t.id`
    )
    .bind(...bindings)
    .all()
    .map((obj) => obj.id);

  const [total] = db
    .prepare(
      `SELECT COUNT(*) count FROM match
      WHERE id IN (${database.params(filteredIds)})
      AND id > ?
      ORDER BY createdAt DESC`
    )
    .bind(filteredIds, sinceId || 0)
    .all();

  const matches = db
    .prepare(
      `SELECT * FROM match
      LEFT JOIN (SELECT filename as isTrained FROM train GROUP BY filename) train ON train.isTrained = match.filename
      WHERE id IN (${database.params(filteredIds)})
      AND id > ?
      ORDER BY createdAt DESC
      LIMIT ?,?`
    )
    .bind(filteredIds, sinceId || 0, limit * (page - 1), limit)
    .all();

  res.send({ total: total.count, limit, matches: await format(matches) });
};

module.exports.delete = async (req, res) => {
  const { ids } = req.body;
  console.log(req.body);
  if (ids.length) {
    const db = database.connect();
    const files = db
      .prepare(`SELECT filename FROM match WHERE id IN (${database.params(ids)})`)
      .bind(ids)
      .all();

    db.prepare(`DELETE FROM match WHERE id IN (${database.params(ids)})`).run(ids);

    files.forEach(({ filename }) => {
      filesystem.delete(`${STORAGE.MEDIA.PATH}/matches/${filename}`);
    });
  }

  res.send({ success: true });
};

module.exports.reprocess = async (req, res) => {
  const { matchId } = req.params;
  if (!DETECTORS.length) return res.status(BAD_REQUEST).error('no detectors configured');

  const db = database.connect();
  let [match] = db.prepare('SELECT * FROM match WHERE id = ?').bind(matchId).all();

  if (!match) return res.status(BAD_REQUEST).error('No match found');

  const results = await process.start({
    camera: tryParseJSON(match.event) ? tryParseJSON(match.event).camera : null,
    filename: match.filename,
    tmp: `${STORAGE.MEDIA.PATH}/matches/${match.filename}`,
  });
  database.update.match({
    id: match.id,
    event: JSON.parse(match.event),
    response: results,
  });
  match = db
    .prepare(
      `SELECT * FROM match
      LEFT JOIN (SELECT filename as isTrained FROM train GROUP BY filename) train ON train.isTrained = match.filename
      WHERE id = ?`
    )
    .bind(matchId)
    .all();
  [match] = await format(match);

  res.send(match);
};

module.exports.filters = async (req, res) => {
  const db = database.connect();

  const [total] = db.prepare('SELECT COUNT(*) count FROM match').all();

  const detectors = db
    .prepare(
      `SELECT json_extract(value, '$.detector') name
        FROM match, json_each(match.response)
        GROUP BY name
        ORDER BY name ASC`
    )
    .all()
    .map((obj) => obj.name);

  const names = db
    .prepare(
      `SELECT json_extract(value, '$.name') name FROM (
          SELECT json_extract(value, '$.results') results
          FROM match, json_each(match.response)
          ) t, json_each(t.results)
        GROUP BY name
        ORDER BY name ASC`
    )
    .all()
    .map((obj) => obj.name);

  const matches = db
    .prepare(
      `SELECT IIF(json_extract(value, '$.match') == 1, 'match', 'miss') name FROM (
          SELECT json_extract(value, '$.results') results
          FROM match, json_each(match.response)
          ) t, json_each(t.results)
        GROUP BY name
        ORDER BY name ASC`
    )
    .all()
    .map((obj) => obj.name);

  const cameras = db
    .prepare(
      `SELECT json_extract(event, '$.camera') name
      FROM match
      GROUP BY name
      ORDER BY name ASC`
    )
    .all()
    .map((obj) => obj.name);

  const types = db
    .prepare(
      `SELECT json_extract(event, '$.type') name
      FROM match
      GROUP BY name
      ORDER BY name ASC`
    )
    .all()
    .map((obj) => obj.name);

  res.send({ total: total.count, detectors, names, matches, cameras, types });
};
