const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// CRUD de base
router.post('/', courseController.createCourse);
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// Routes spéciales
router.get('/teacher/:teacher_id', courseController.getCoursesByTeacher);
router.get('/class/:class_id', courseController.getCoursesByClass);

module.exports = router;