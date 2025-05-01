const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

// CRUD de base
router.post('/', timetableController.createTimetableEntry);
router.get('/', timetableController.getAllTimetableEntries);
router.get('/course/:course_id', timetableController.getTimetableByCourse);
router.get('/class/:class_id', timetableController.getClassTimetable);
router.put('/:id', timetableController.updateTimetableEntry);
router.delete('/:id', timetableController.deleteTimetableEntry);

// Routes spéciales
router.get('/current/:class_id', timetableController.getCurrentTimetable);

module.exports = router;