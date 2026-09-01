const express = require('express');
const router = express.Router();
const { listOwners } = require('../controllers/owner.controller');

// Public: list available fleet owners for customers to send requests to
router.get('/owners', listOwners);

module.exports = router;
