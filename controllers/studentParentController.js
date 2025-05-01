const pool = require('../databases/db');

const studentParentController = {
    // Créer une relation étudiant-parent
    createRelation: async (req, res) => {
        const { student_id, parent_id, relationship, is_primary_contact } = req.body;

        try {
            // Vérifier si la relation existe déjà
            const [existing] = await pool.query(
                'SELECT * FROM Student_Parent WHERE student_id = ? AND parent_id = ?',
                [student_id, parent_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    message: 'Cette relation étudiant-parent existe déjà'
                });
            }

            // Créer la nouvelle relation
            const [result] = await pool.query(
                'INSERT INTO Student_Parent (student_id, parent_id, relationship, is_primary_contact) VALUES (?, ?, ?, ?)',
                [student_id, parent_id, relationship, is_primary_contact || false]
            );

            // Récupérer la relation créée
            const [relation] = await pool.query(
                `SELECT sp.*, s.first_name as student_first_name, s.last_name as student_last_name,
         p.first_name as parent_first_name, p.last_name as parent_last_name
         FROM Student_Parent sp
         JOIN Students s ON sp.student_id = s.student_id
         JOIN Parents p ON sp.parent_id = p.parent_id
         WHERE sp.student_id = ? AND sp.parent_id = ?`,
                [student_id, parent_id]
            );

            res.status(201).json(relation[0]);
        } catch (error) {
            console.error('Error creating student-parent relation:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({
                    message: 'Étudiant ou parent non trouvé'
                });
            }
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Récupérer toutes les relations d'un étudiant
    getStudentRelations: async (req, res) => {
        try {
            const [relations] = await pool.query(
                `SELECT sp.*, p.first_name as parent_first_name, p.last_name as parent_last_name,
         p.email, p.phone, p.profession
         FROM Student_Parent sp
         JOIN Parents p ON sp.parent_id = p.parent_id
         WHERE sp.student_id = ?`,
                [req.params.student_id]
            );

            res.json(relations);
        } catch (error) {
            console.error('Error fetching student relations:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Récupérer toutes les relations d'un parent
    getParentRelations: async (req, res) => {
        try {
            const [relations] = await pool.query(
                `SELECT sp.*, s.first_name as student_first_name, s.last_name as student_last_name,
         s.email, s.phone, s.enrollment_date
         FROM Student_Parent sp
         JOIN Students s ON sp.student_id = s.student_id
         WHERE sp.parent_id = ?`,
                [req.params.parent_id]
            );

            res.json(relations);
        } catch (error) {
            console.error('Error fetching parent relations:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Mettre à jour une relation
    updateRelation: async (req, res) => {
        const { student_id, parent_id } = req.params;
        const { relationship, is_primary_contact } = req.body;

        try {
            const [result] = await pool.query(
                'UPDATE Student_Parent SET relationship = ?, is_primary_contact = ? WHERE student_id = ? AND parent_id = ?',
                [relationship, is_primary_contact, student_id, parent_id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Relation non trouvée'
                });
            }

            // Récupérer la relation mise à jour
            const [relation] = await pool.query(
                `SELECT sp.*, s.first_name as student_first_name, s.last_name as student_last_name,
         p.first_name as parent_first_name, p.last_name as parent_last_name
         FROM Student_Parent sp
         JOIN Students s ON sp.student_id = s.student_id
         JOIN Parents p ON sp.parent_id = p.parent_id
         WHERE sp.student_id = ? AND sp.parent_id = ?`,
                [student_id, parent_id]
            );

            res.json(relation[0]);
        } catch (error) {
            console.error('Error updating relation:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Supprimer une relation
    deleteRelation: async (req, res) => {
        const { student_id, parent_id } = req.params;

        try {
            const [result] = await pool.query(
                'DELETE FROM Student_Parent WHERE student_id = ? AND parent_id = ?',
                [student_id, parent_id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Relation non trouvée'
                });
            }

            res.json({
                message: 'Relation supprimée avec succès',
                student_id: parseInt(student_id),
                parent_id: parseInt(parent_id)
            });
        } catch (error) {
            console.error('Error deleting relation:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Récupérer le contact principal d'un étudiant
    getPrimaryContact: async (req, res) => {
        try {
            const [contact] = await pool.query(
                `SELECT p.* FROM Parents p
         JOIN Student_Parent sp ON p.parent_id = sp.parent_id
         WHERE sp.student_id = ? AND sp.is_primary_contact = TRUE
         LIMIT 1`,
                [req.params.student_id]
            );

            if (contact.length === 0) {
                return res.status(404).json({
                    message: 'Aucun contact principal trouvé pour cet étudiant'
                });
            }

            res.json(contact[0]);
        } catch (error) {
            console.error('Error fetching primary contact:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }
};

module.exports = studentParentController;