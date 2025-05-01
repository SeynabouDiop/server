const pool = require('../databases/db');
const { validateParent } = require('../middlewares/validation');

const parentController = {
    getAllParents: async (req, res) => {
        try {
            const [rows] = await pool.query(`
        SELECT parent_id, first_name, last_name, email, phone, address, profession 
        FROM Parents
        ORDER BY last_name, first_name
      `);
            res.json(rows);
        } catch (error) {
            console.error('Error fetching parents:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des parents' });
        }
    },

    getParentById: async (req, res) => {
        try {
            const [rows] = await pool.query(`
        SELECT parent_id, first_name, last_name, email, phone, address, profession 
        FROM Parents 
        WHERE parent_id = ?
      `, [req.params.id]);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Parent non trouvé' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error fetching parent:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération du parent' });
        }
    },

    createParent: [
        validateParent,
        async (req, res) => {
            const { first_name, last_name, email, phone, address, profession } = req.body;

            try {
                const [result] = await pool.query(
                    `INSERT INTO Parents 
          (first_name, last_name, email, phone, address, profession) 
          VALUES (?, ?, ?, ?, ?, ?)`,
                    [first_name, last_name, email, phone, address, profession]
                );

                const [newParent] = await pool.query(
                    `SELECT parent_id, first_name, last_name, email, phone, address, profession 
          FROM Parents WHERE parent_id = ?`,
                    [result.insertId]
                );

                res.status(201).json(newParent[0]);
            } catch (error) {
                console.error('Error creating parent:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Cet email ou numéro de téléphone existe déjà' });
                }
                res.status(500).json({ message: 'Erreur lors de la création du parent' });
            }
        }
    ],

    updateParent: [
        validateParent,
        async (req, res) => {
            const { id } = req.params;
            const { first_name, last_name, email, phone, address, profession } = req.body;

            try {
                const [result] = await pool.query(
                    `UPDATE Parents SET 
          first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, profession = ?
          WHERE parent_id = ?`,
                    [first_name, last_name, email, phone, address, profession, id]
                );

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Parent non trouvé' });
                }

                const [updatedParent] = await pool.query(
                    `SELECT parent_id, first_name, last_name, email, phone, address, profession 
          FROM Parents WHERE parent_id = ?`,
                    [id]
                );

                res.json(updatedParent[0]);
            } catch (error) {
                console.error('Error updating parent:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Cet email ou numéro de téléphone existe déjà' });
                }
                res.status(500).json({ message: 'Erreur lors de la mise à jour du parent' });
            }
        }
    ],

    deleteParent: async (req, res) => {
        try {
            // Vérifier d'abord si le parent existe
            const [check] = await pool.query(
                'SELECT parent_id FROM Parents WHERE parent_id = ?',
                [req.params.id]
            );

            if (check.length === 0) {
                return res.status(404).json({ message: 'Parent non trouvé' });
            }

            // Supprimer le parent
            await pool.query('DELETE FROM Parents WHERE parent_id = ?', [req.params.id]);

            res.json({ message: 'Parent supprimé avec succès' });
        } catch (error) {
            console.error('Error deleting parent:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    message: 'Impossible de supprimer : ce parent est associé à un ou plusieurs élèves'
                });
            }
            res.status(500).json({ message: 'Erreur lors de la suppression du parent' });
        }
    }
};

module.exports = parentController;