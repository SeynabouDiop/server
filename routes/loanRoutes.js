const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

// CRUD de base
router.post('/', loanController.createLoan);
router.get('/', loanController.getAllLoans);
router.get('/:id', loanController.getLoanById);
router.get('/student/:student_id', loanController.getStudentLoans);
router.get('/active/loans', loanController.getActiveLoans);

// Gestion des retours
router.post('/:id/return', loanController.returnBook);

// Gestion des statuts
router.patch('/:id/status', loanController.updateLoanStatus);

// Tâches automatiques
router.post('/check-overdue', loanController.checkOverdueLoans);

module.exports = router;