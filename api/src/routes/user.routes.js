const express = require('express');
const { jwt } = require('../middlewares');
const controller = require('../controllers/user.controller');

const router = express.Router();

router
  .get('/', jwt, controller.getall)
  .post('/add/:name', jwt, controller.add)
  .delete('/remove', jwt, controller.delete);

module.exports = router;
