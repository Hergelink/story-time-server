const express = require('express');
const { textGenerator } = require('../controllers/openaiController');
const router = express.Router();

router.post('/generatetext', textGenerator);

module.exports = router;