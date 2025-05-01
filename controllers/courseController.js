const pool = require('../databases/db');

const courseController = {
    // Créer un nouveau cours
    createCourse: async (req, res) => {
        const { subject_id, teacher_id, class_id, description } = req.body;

        try {
            // Vérifier les contraintes d'intégrité référentielle
            const [subjectCheck] = await pool.query('SELECT subject_id FROM Subjects WHERE subject_id = ?', [subject_id]);
            const [teacherCheck] = await pool.query('SELECT teacher_id FROM Teachers WHERE teacher_id = ?', [teacher_id]);
            const [classCheck] = await pool.query('SELECT class_id FROM Classes WHERE class_id = ?', [class_id]);

            if (!subjectCheck.length || !teacherCheck.length || !classCheck.length) {
                return res.status(400).json({
                    message: 'Subject, teacher or class not found'
                });
            }

            const [result] = await pool.query(
                `INSERT INTO Courses 
        (subject_id, teacher_id, class_id, description) 
        VALUES (?, ?, ?, ?)`,
                [subject_id, teacher_id, class_id, description]
            );

            const [newCourse] = await pool.query(`
        SELECT c.*, 
        s.subject_name, 
        t.first_name as teacher_first_name, t.last_name as teacher_last_name,
        cl.class_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Teachers t ON c.teacher_id = t.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE c.course_id = ?
      `, [result.insertId]);

            res.status(201).json(newCourse[0]);
        } catch (error) {
            console.error('Error creating course:', error);
            res.status(500).json({ message: 'Error creating course' });
        }
    },

    // Récupérer tous les cours
    getAllCourses: async (req, res) => {
        try {
            const [courses] = await pool.query(`
        SELECT c.*, 
        s.subject_name, 
        t.first_name as teacher_first_name, t.last_name as teacher_last_name,
        cl.class_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Teachers t ON c.teacher_id = t.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        ORDER BY c.created_at DESC
      `);
            res.json(courses);
        } catch (error) {
            console.error('Error fetching courses:', error);
            res.status(500).json({ message: 'Error fetching courses' });
        }
    },

    // Récupérer un cours par ID
    getCourseById: async (req, res) => {
        try {
            const [course] = await pool.query(`
        SELECT c.*, 
        s.subject_name, 
        t.first_name as teacher_first_name, t.last_name as teacher_last_name,
        cl.class_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Teachers t ON c.teacher_id = t.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE c.course_id = ?
      `, [req.params.id]);

            if (course.length === 0) {
                return res.status(404).json({ message: 'Course not found' });
            }

            res.json(course[0]);
        } catch (error) {
            console.error('Error fetching course:', error);
            res.status(500).json({ message: 'Error fetching course' });
        }
    },

    // Mettre à jour un cours
    updateCourse: async (req, res) => {
        const { id } = req.params;
        const { subject_id, teacher_id, class_id, description } = req.body;

        try {
            // Vérifier si le cours existe
            const [courseCheck] = await pool.query('SELECT course_id FROM Courses WHERE course_id = ?', [id]);
            if (courseCheck.length === 0) {
                return res.status(404).json({ message: 'Course not found' });
            }

            // Vérifier les nouvelles références
            if (subject_id) {
                const [subjectCheck] = await pool.query('SELECT subject_id FROM Subjects WHERE subject_id = ?', [subject_id]);
                if (subjectCheck.length === 0) {
                    return res.status(400).json({ message: 'Subject not found' });
                }
            }

            if (teacher_id) {
                const [teacherCheck] = await pool.query('SELECT teacher_id FROM Teachers WHERE teacher_id = ?', [teacher_id]);
                if (teacherCheck.length === 0) {
                    return res.status(400).json({ message: 'Teacher not found' });
                }
            }

            if (class_id) {
                const [classCheck] = await pool.query('SELECT class_id FROM Classes WHERE class_id = ?', [class_id]);
                if (classCheck.length === 0) {
                    return res.status(400).json({ message: 'Class not found' });
                }
            }

            const [result] = await pool.query(
                `UPDATE Courses SET
        subject_id = COALESCE(?, subject_id),
        teacher_id = COALESCE(?, teacher_id),
        class_id = COALESCE(?, class_id),
        description = COALESCE(?, description)
        WHERE course_id = ?`,
                [subject_id, teacher_id, class_id, description, id]
            );

            const [updatedCourse] = await pool.query(`
        SELECT c.*, 
        s.subject_name, 
        t.first_name as teacher_first_name, t.last_name as teacher_last_name,
        cl.class_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Teachers t ON c.teacher_id = t.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE c.course_id = ?
      `, [id]);

            res.json(updatedCourse[0]);
        } catch (error) {
            console.error('Error updating course:', error);
            res.status(500).json({ message: 'Error updating course' });
        }
    },

    // Supprimer un cours
    deleteCourse: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Courses WHERE course_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Course not found' });
            }

            res.json({ message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).json({ message: 'Error deleting course' });
        }
    },

    // Récupérer les cours par enseignant
    getCoursesByTeacher: async (req, res) => {
        try {
            const [courses] = await pool.query(`
        SELECT c.*, s.subject_name, cl.class_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE c.teacher_id = ?
        ORDER BY cl.class_name
      `, [req.params.teacher_id]);

            res.json(courses);
        } catch (error) {
            console.error('Error fetching teacher courses:', error);
            res.status(500).json({ message: 'Error fetching teacher courses' });
        }
    },

    // Récupérer les cours par classe
    getCoursesByClass: async (req, res) => {
        try {
            const [courses] = await pool.query(`
        SELECT c.*, s.subject_name, 
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Courses c
        JOIN Subjects s ON c.subject_id = s.subject_id
        JOIN Teachers t ON c.teacher_id = t.teacher_id
        WHERE c.class_id = ?
        ORDER BY s.subject_name
      `, [req.params.class_id]);

            res.json(courses);
        } catch (error) {
            console.error('Error fetching class courses:', error);
            res.status(500).json({ message: 'Error fetching class courses' });
        }
    }
};

module.exports = courseController;