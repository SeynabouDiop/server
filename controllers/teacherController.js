const pool = require('../databases/db');

const getAllTeachers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Teachers');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getTeacherById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Teachers WHERE teacher_id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createTeacher = async (req, res) => {
    const { first_name, last_name, birth_date, gender, email, phone, hire_date, speciality } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO Teachers (first_name, last_name, birth_date, gender, email, phone, hire_date, speciality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, birth_date, gender, email, phone, hire_date, speciality]
        );

        const newTeacher = {
            teacher_id: result.insertId,
            ...req.body
        };

        res.status(201).json(newTeacher);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

const updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, birth_date, gender, email, phone, hire_date, speciality } = req.body;

    try {
        const [result] = await pool.query(
            'UPDATE Teachers SET first_name = ?, last_name = ?, birth_date = ?, gender = ?, email = ?, phone = ?, hire_date = ?, speciality = ? WHERE teacher_id = ?',
            [first_name, last_name, birth_date, gender, email, phone, hire_date, speciality, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.json({ teacher_id: id, ...req.body });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteTeacher = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Teachers WHERE teacher_id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher
};