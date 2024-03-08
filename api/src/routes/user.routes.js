const express = require('express');
const multer = require('multer');
const { jwt } = require('../middlewares');
const controller = require('../controllers/user.controller');

const router = express.Router();

router
  .get('/', jwt, controller.getall)
  .post('/add', jwt, controller.add)
  .delete('/remove', jwt, controller.delete);

router.get('/timeline', jwt, controller.timeline);
router.patch('/checkfaceagain', jwt, controller.checkfaceagain);
router.post('/comparetwofaces', jwt, controller.comparetwofaces);
router.post('/savetmpimg', jwt, multer().single('image'), controller.savetmpimg);
router.post('/updateuser', jwt, controller.updateuser);
router.post('/adduserbyxlxs', jwt, controller.adduserbyxlxs);

module.exports = router;
