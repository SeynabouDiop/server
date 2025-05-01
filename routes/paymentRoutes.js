const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// CRUD de base
router.post('/', paymentController.createPayment);
router.get('/', paymentController.getAllPayments);
router.get('/student/:student_id', paymentController.getStudentPayments);
router.get('/:id', paymentController.getPaymentById);
router.put('/:id', paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

// Routes spéciales
router.get('/report', paymentController.getPaymentsReport);

module.exports = router;