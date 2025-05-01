const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');

// CRUD de base
router.post('/', gradeController.createGrade);
router.get('/student/:student_id', gradeController.getStudentGrades);
router.get('/course/:course_id', gradeController.getCourseGrades);
router.put('/:id', gradeController.updateGrade);
router.delete('/:id', gradeController.deleteGrade);

// Routes spéciales
router.get('/average/:student_id/:course_id', gradeController.getStudentCourseAverage);

module.exports = router;