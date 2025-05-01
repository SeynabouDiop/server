const pool = require('../databases/db');

const getAllStudents = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT s.*, c.class_name 
      FROM Students s
      LEFT JOIN Classes c ON s.class_id = c.class_id
    `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getStudentById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT s.*, c.class_name 
      FROM Students s
      LEFT JOIN Classes c ON s.class_id = c.class_id
      WHERE student_id = ?
    `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createStudent = async (req, res) => {
    const { first_name, last_name, birth_date, gender, address, email, phone, enrollment_date, class_id } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO Students 
      (first_name, last_name, birth_date, gender, address, email, phone, enrollment_date, class_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, birth_date, gender, address, email, phone, enrollment_date, class_id]
        );

        const [newStudent] = await pool.query(`
      SELECT s.*, c.class_name 
      FROM Students s
      LEFT JOIN Classes c ON s.class_id = c.class_id
      WHERE student_id = ?
    `, [result.insertId]);

        res.status(201).json(newStudent[0]);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Invalid class_id' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, birth_date, gender, address, email, phone, enrollment_date, class_id } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE Students SET 
      first_name = ?, last_name = ?, birth_date = ?, gender = ?, address = ?, 
      email = ?, phone = ?, enrollment_date = ?, class_id = ? 
      WHERE student_id = ?`,
            [first_name, last_name, birth_date, gender, address, email, phone, enrollment_date, class_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const [updatedStudent] = await pool.query(`
      SELECT s.*, c.class_name 
      FROM Students s
      LEFT JOIN Classes c ON s.class_id = c.class_id
      WHERE student_id = ?
    `, [id]);

        res.json(updatedStudent[0]);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Invalid class_id' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Students WHERE student_id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
};