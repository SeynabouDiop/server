const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// CRUD de base
router.post('/', attendanceController.recordAttendance);
router.get('/student/:student_id', attendanceController.getStudentAttendance);
router.get('/course/:course_id/:date', attendanceController.getCourseAttendance);
router.put('/:id', attendanceController.updateAttendance);
router.delete('/:id', attendanceController.deleteAttendance);

// Routes spéciales
router.get('/stats/:student_id/:course_id', attendanceController.getAttendanceStats);

module.exports = router;