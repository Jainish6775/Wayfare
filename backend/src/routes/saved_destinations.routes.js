const express = require('express');
const router = express.Router();
const savedDestinationsController = require('../controllers/saved_destinations.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', savedDestinationsController.getAll);
router.post('/', savedDestinationsController.save);
router.delete('/:id', savedDestinationsController.remove);

module.exports = router;
