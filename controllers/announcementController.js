const pool = require('../databases/db');
const { validateAnnouncement } = require('../middlewares/validationAnnouncements');

const announcementController = {
    // Créer une nouvelle annonce
    createAnnouncement: async (req, res) => {
        const {
            title,
            content,
            author_id,
            target_audience,
            target_class_id,
            start_date,
            end_date,
            is_published
        } = req.body;

        try {
            // Validation des données
            const validationError = validateAnnouncement(req.body);
            if (validationError) {
                return res.status(400).json(validationError);
            }

            // Vérifier l'auteur
            const [author] = await pool.query('SELECT user_id FROM Users WHERE user_id = ?', [author_id]);
            if (!author.length) {
                return res.status(404).json({ message: 'Auteur non trouvé' });
            }

            // Vérifier la classe cible si nécessaire
            if (target_audience === 'Class' && !target_class_id) {
                return res.status(400).json({ message: 'Une classe cible est requise' });
            }

            if (target_class_id) {
                const [classExists] = await pool.query('SELECT class_id FROM Classes WHERE class_id = ?', [target_class_id]);
                if (!classExists.length) {
                    return res.status(404).json({ message: 'Classe non trouvée' });
                }
            }

            const [result] = await pool.query(
                `INSERT INTO Announcements 
        (title, content, author_id, target_audience, target_class_id, start_date, end_date, is_published) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    title,
                    content,
                    author_id,
                    target_audience,
                    target_class_id || null,
                    start_date,
                    end_date,
                    is_published || false
                ]
            );

            const [newAnnouncement] = await pool.query(`
        SELECT a.*, 
        u.username as author_username,
        c.class_name as target_class_name
        FROM Announcements a
        JOIN Users u ON a.author_id = u.user_id
        LEFT JOIN Classes c ON a.target_class_id = c.class_id
        WHERE a.announcement_id = ?
      `, [result.insertId]);

            res.status(201).json(newAnnouncement[0]);
        } catch (error) {
            console.error('Erreur création annonce:', error);
            res.status(500).json({ message: 'Erreur création annonce' });
        }
    },

    // Récupérer toutes les annonces
    getAllAnnouncements: async (req, res) => {
        try {
            const [announcements] = await pool.query(`
        SELECT a.*, 
        u.username as author_username,
        c.class_name as target_class_name
        FROM Announcements a
        JOIN Users u ON a.author_id = u.user_id
        LEFT JOIN Classes c ON a.target_class_id = c.class_id
        ORDER BY a.created_at DESC
      `);
            res.json(announcements);
        } catch (error) {
            console.error('Erreur récupération annonces:', error);
            res.status(500).json({ message: 'Erreur récupération annonces' });
        }
    },

    // Récupérer les annonces publiées
    getPublishedAnnouncements: async (req, res) => {
        const { audience, class_id } = req.query;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        try {
            let query = `
        SELECT a.*, 
        u.username as author_username,
        c.class_name as target_class_name
        FROM Announcements a
        JOIN Users u ON a.author_id = u.user_id
        LEFT JOIN Classes c ON a.target_class_id = c.class_id
        WHERE a.is_published = TRUE
        AND a.start_date <= ?
        AND a.end_date >= ?
      `;
            const params = [now, now];

            if (audience) {
                if (audience === 'Class' && class_id) {
                    query += ' AND (a.target_audience = ? OR (a.target_audience = ? AND a.target_class_id = ?))';
                    params.push('All', 'Class', class_id);
                } else {
                    query += ' AND (a.target_audience = ? OR a.target_audience = ?)';
                    params.push('All', audience);
                }
            }

            query += ' ORDER BY a.created_at DESC';

            const [announcements] = await pool.query(query, params);
            res.json(announcements);
        } catch (error) {
            console.error('Erreur récupération annonces publiées:', error);
            res.status(500).json({ message: 'Erreur récupération annonces publiées' });
        }
    },

    // Récupérer une annonce par ID
    getAnnouncementById: async (req, res) => {
        try {
            const [announcement] = await pool.query(`
        SELECT a.*, 
        u.username as author_username,
        c.class_name as target_class_name
        FROM Announcements a
        JOIN Users u ON a.author_id = u.user_id
        LEFT JOIN Classes c ON a.target_class_id = c.class_id
        WHERE a.announcement_id = ?
      `, [req.params.id]);

            if (announcement.length === 0) {
                return res.status(404).json({ message: 'Annonce non trouvée' });
            }

            res.json(announcement[0]);
        } catch (error) {
            console.error('Erreur récupération annonce:', error);
            res.status(500).json({ message: 'Erreur récupération annonce' });
        }
    },

    // Mettre à jour une annonce
    updateAnnouncement: async (req, res) => {
        const { id } = req.params;
        const {
            title,
            content,
            target_audience,
            target_class_id,
            start_date,
            end_date,
            is_published
        } = req.body;

        try {
            // Vérifier que l'annonce existe
            const [existing] = await pool.query('SELECT * FROM Announcements WHERE announcement_id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Annonce non trouvée' });
            }

            // Validation des données
            const validationError = validateAnnouncement(req.body, true);
            if (validationError) {
                return res.status(400).json(validationError);
            }

            // Vérifier la classe cible si nécessaire
            if (target_audience === 'Class' && !target_class_id) {
                return res.status(400).json({ message: 'Une classe cible est requise' });
            }

            if (target_class_id) {
                const [classExists] = await pool.query('SELECT class_id FROM Classes WHERE class_id = ?', [target_class_id]);
                if (!classExists.length) {
                    return res.status(404).json({ message: 'Classe non trouvée' });
                }
            }

            const [result] = await pool.query(
                `UPDATE Announcements SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        target_audience = COALESCE(?, target_audience),
        target_class_id = COALESCE(?, target_class_id),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        is_published = COALESCE(?, is_published)
        WHERE announcement_id = ?`,
                [
                    title,
                    content,
                    target_audience,
                    target_class_id,
                    start_date,
                    end_date,
                    is_published,
                    id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Annonce non trouvée' });
            }

            const [updatedAnnouncement] = await pool.query(`
        SELECT a.*, 
        u.username as author_username,
        c.class_name as target_class_name
        FROM Announcements a
        JOIN Users u ON a.author_id = u.user_id
        LEFT JOIN Classes c ON a.target_class_id = c.class_id
        WHERE a.announcement_id = ?
      `, [id]);

            res.json(updatedAnnouncement[0]);
        } catch (error) {
            console.error('Erreur mise à jour annonce:', error);
            res.status(500).json({ message: 'Erreur mise à jour annonce' });
        }
    },

    // Supprimer une annonce
    deleteAnnouncement: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Announcements WHERE announcement_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Annonce non trouvée' });
            }

            res.json({ message: 'Annonce supprimée avec succès' });
        } catch (error) {
            console.error('Erreur suppression annonce:', error);
            res.status(500).json({ message: 'Erreur suppression annonce' });
        }
    },

    // Publier/dépublier une annonce
    togglePublishStatus: async (req, res) => {
        const { id } = req.params;
        const { publish } = req.body;

        try {
            const [result] = await pool.query(
                'UPDATE Announcements SET is_published = ? WHERE announcement_id = ?',
                [publish, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Annonce non trouvée' });
            }

            res.json({
                message: `Annonce ${publish ? 'publiée' : 'dépubliée'} avec succès`,
                is_published: publish
            });
        } catch (error) {
            console.error('Erreur changement statut publication:', error);
            res.status(500).json({ message: 'Erreur changement statut publication' });
        }
    }
};

module.exports = announcementController;