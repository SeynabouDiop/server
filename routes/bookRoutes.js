const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

// CRUD de base
router.post('/', bookController.createBook);
router.get('/', bookController.getAllBooks);
router.get('/search', bookController.searchBooks);
router.get('/:id', bookController.getBookById);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

// Gestion des quantités
router.patch('/:id/quantity', bookController.updateBookQuantity);

module.exports = router;