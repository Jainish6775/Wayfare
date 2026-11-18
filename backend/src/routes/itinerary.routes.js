const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itinerary.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Activities
router.get('/:stopId/activities', itineraryController.getActivitiesForStop);
router.post('/:stopId/activities', itineraryController.addActivity);
router.put('/:stopId/activities/:id', itineraryController.updateActivity);
router.delete('/:stopId/activities/:id', itineraryController.deleteActivity);

// Accommodations
router.get('/:stopId/accommodation', itineraryController.getAccommodationsForStop);
router.post('/:stopId/accommodation', itineraryController.addAccommodation);
router.put('/:stopId/accommodation/:id', itineraryController.updateAccommodation);
router.delete('/:stopId/accommodation/:id', itineraryController.deleteAccommodation);

// Transports
router.get('/:stopId/transport', itineraryController.getTransportsForStop);
router.post('/:stopId/transport', itineraryController.addTransport);
router.put('/:stopId/transport/:id', itineraryController.updateTransport);
router.delete('/:stopId/transport/:id', itineraryController.deleteTransport);

module.exports = router;
