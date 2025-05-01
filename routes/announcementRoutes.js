const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');

// CRUD de base
router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAllAnnouncements);
router.get('/published', announcementController.getPublishedAnnouncements);
router.get('/:id', announcementController.getAnnouncementById);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

// Gestion de la publication
router.patch('/:id/publish', announcementController.togglePublishStatus);

module.exports = router;