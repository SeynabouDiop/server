const express = require('express');
const router = express.Router();
const studentParentController = require('../controllers/studentParentController');

// Routes CRUD
router.post('/', studentParentController.createRelation);
router.get('/student/:student_id', studentParentController.getStudentRelations);
router.get('/parent/:parent_id', studentParentController.getParentRelations);
router.put('/:student_id/:parent_id', studentParentController.updateRelation);
router.delete('/:student_id/:parent_id', studentParentController.deleteRelation);

// Route spéciale
router.get('/primary-contact/:student_id', studentParentController.getPrimaryContact);

module.exports = router;