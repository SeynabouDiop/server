const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Route d'enregistrement
router.post('/register', userController.registerUser); 

// Route de connexion
router.post('/login', userController.loginUser); 

// Route pour récupérer le profil utilisateur
router.get('/me', authMiddleware(), userController.getCurrentUser);

// Exemple de route admin protégée
router.get('/admin-dashboard', authMiddleware(['Admin']), (req, res) => {
  res.json({ message: 'Accès admin autorisé' });
});

module.exports = router;