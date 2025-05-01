const pool = require('../databases/db');

const subjectController = {
    // Récupérer toutes les matières
    getAllSubjects: async (req, res) => {
        try {
            const [subjects] = await pool.query(`
        SELECT subject_id, subject_name, description, credits 
        FROM Subjects
        ORDER BY subject_name
      `);
            res.json(subjects);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des matières' });
        }
    },

    // Récupérer une matière par ID
    getSubjectById: async (req, res) => {
        try {
            const [subject] = await pool.query(`
        SELECT subject_id, subject_name, description, credits 
        FROM Subjects 
        WHERE subject_id = ?
      `, [req.params.id]);

            if (subject.length === 0) {
                return res.status(404).json({ message: 'Matière non trouvée' });
            }

            res.json(subject[0]);
        } catch (error) {
            console.error('Error fetching subject:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération de la matière' });
        }
    },

    // Créer une nouvelle matière
    createSubject: async (req, res) => {
        const { subject_name, description, credits } = req.body;

        // Validation basique
        if (!subject_name) {
            return res.status(400).json({ message: 'Le nom de la matière est obligatoire' });
        }

        try {
            const [result] = await pool.query(
                `INSERT INTO Subjects 
        (subject_name, description, credits) 
        VALUES (?, ?, ?)`,
                [subject_name, description, credits || 1]
            );

            const [newSubject] = await pool.query(
                `SELECT subject_id, subject_name, description, credits 
        FROM Subjects WHERE subject_id = ?`,
                [result.insertId]
            );

            res.status(201).json(newSubject[0]);
        } catch (error) {
            console.error('Error creating subject:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Cette matière existe déjà' });
            }
            res.status(500).json({ message: 'Erreur lors de la création de la matière' });
        }
    },

    // Mettre à jour une matière
    updateSubject: async (req, res) => {
        const { id } = req.params;
        const { subject_name, description, credits } = req.body;

        try {
            const [result] = await pool.query(
                `UPDATE Subjects SET 
        subject_name = ?, description = ?, credits = ?
        WHERE subject_id = ?`,
                [subject_name, description, credits, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Matière non trouvée' });
            }

            const [updatedSubject] = await pool.query(
                `SELECT subject_id, subject_name, description, credits 
        FROM Subjects WHERE subject_id = ?`,
                [id]
            );

            res.json(updatedSubject[0]);
        } catch (error) {
            console.error('Error updating subject:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Cette matière existe déjà' });
            }
            res.status(500).json({ message: 'Erreur lors de la mise à jour de la matière' });
        }
    },

    // Supprimer une matière
    deleteSubject: async (req, res) => {
        try {
            // Vérifier d'abord si la matière existe
            const [check] = await pool.query(
                'SELECT subject_id FROM Subjects WHERE subject_id = ?',
                [req.params.id]
            );

            if (check.length === 0) {
                return res.status(404).json({ message: 'Matière non trouvée' });
            }

            // Supprimer la matière
            await pool.query('DELETE FROM Subjects WHERE subject_id = ?', [req.params.id]);

            res.json({ message: 'Matière supprimée avec succès' });
        } catch (error) {
            console.error('Error deleting subject:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    message: 'Impossible de supprimer : cette matière est associée à des cours'
                });
            }
            res.status(500).json({ message: 'Erreur lors de la suppression de la matière' });
        }
    }
};

module.exports = subjectController;