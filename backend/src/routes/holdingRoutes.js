const express = require('express');
const router = express.Router();
const holdingController = require('../controllers/holdingController');
const auth = require('../middleware/auth');

router.get('/', auth, holdingController.getHoldings);
router.post('/', auth, holdingController.createHolding);
router.delete('/:id', auth, holdingController.deleteHolding);

module.exports = router;
