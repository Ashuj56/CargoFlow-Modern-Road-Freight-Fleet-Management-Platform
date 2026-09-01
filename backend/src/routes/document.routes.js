const express = require('express');
const router = express.Router();
const controller = require('../controllers/document.controller');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, controller.list);

module.exports = router;
