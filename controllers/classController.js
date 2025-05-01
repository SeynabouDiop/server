const pool = require('../databases/db');

const getAllClasses = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name 
      FROM Classes c
      LEFT JOIN Teachers t ON c.head_teacher_id = t.teacher_id
    `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

const getClassById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name 
      FROM Classes c
      LEFT JOIN Teachers t ON c.head_teacher_id = t.teacher_id
      WHERE class_id = ?
    `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Classe non trouvée' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

const createClass = async (req, res) => {
    const { class_name, academic_year, level, head_teacher_id } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO Classes 
      (class_name, academic_year, level, head_teacher_id) 
      VALUES (?, ?, ?, ?)`,
            [class_name, academic_year, level, head_teacher_id]
        );

        const [newClass] = await pool.query(`
      SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name 
      FROM Classes c
      LEFT JOIN Teachers t ON c.head_teacher_id = t.teacher_id
      WHERE class_id = ?
    `, [result.insertId]);

        res.status(201).json(newClass[0]);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Professeur principal invalide' });
        }
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

const updateClass = async (req, res) => {
    const { id } = req.params;
    const { class_name, academic_year, level, head_teacher_id } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE Classes SET 
      class_name = ?, academic_year = ?, level = ?, head_teacher_id = ?
      WHERE class_id = ?`,
            [class_name, academic_year, level, head_teacher_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Classe non trouvée' });
        }

        const [updatedClass] = await pool.query(`
      SELECT c.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name 
      FROM Classes c
      LEFT JOIN Teachers t ON c.head_teacher_id = t.teacher_id
      WHERE class_id = ?
    `, [id]);

        res.json(updatedClass[0]);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Professeur principal invalide' });
        }
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

const deleteClass = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Classes WHERE class_id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Classe non trouvée' });
        }

        res.json({ message: 'Classe supprimée avec succès' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Impossible de supprimer : des étudiants sont associés à cette classe' });
        }
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

module.exports = {
    getAllClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass
};