const pool = require('../databases/db');

const gradeController = {
    // Créer une nouvelle note
    createGrade: async (req, res) => {
        const { student_id, course_id, grade, grade_type, grade_date, comments, recorded_by } = req.body;

        try {
            // Validation des références
            const [student] = await pool.query('SELECT student_id FROM Students WHERE student_id = ?', [student_id]);
            const [course] = await pool.query('SELECT course_id FROM Courses WHERE course_id = ?', [course_id]);
            const [teacher] = await pool.query('SELECT teacher_id FROM Teachers WHERE teacher_id = ?', [recorded_by]);

            if (!student.length || !course.length || !teacher.length) {
                return res.status(400).json({ message: 'Étudiant, cours ou enseignant invalide' });
            }

            // Validation de la note
            if (grade < 0 || grade > 20) {
                return res.status(400).json({ message: 'La note doit être entre 0 et 20' });
            }

            const [result] = await pool.query(
                `INSERT INTO Grades 
        (student_id, course_id, grade, grade_type, grade_date, comments, recorded_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [student_id, course_id, grade, grade_type, grade_date, comments, recorded_by]
            );

            const [newGrade] = await pool.query(`
        SELECT g.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        c.course_id, sub.subject_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Grades g
        JOIN Students s ON g.student_id = s.student_id
        JOIN Courses c ON g.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers t ON g.recorded_by = t.teacher_id
        WHERE g.grade_id = ?
      `, [result.insertId]);

            res.status(201).json(newGrade[0]);
        } catch (error) {
            console.error('Erreur création note:', error);
            res.status(500).json({ message: 'Erreur création note' });
        }
    },

    // Récupérer toutes les notes d'un étudiant
    getStudentGrades: async (req, res) => {
        try {
            const [grades] = await pool.query(`
        SELECT g.*, 
        c.course_id, sub.subject_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Grades g
        JOIN Courses c ON g.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers t ON g.recorded_by = t.teacher_id
        WHERE g.student_id = ?
        ORDER BY g.grade_date DESC
      `, [req.params.student_id]);

            res.json(grades);
        } catch (error) {
            console.error('Erreur récupération notes:', error);
            res.status(500).json({ message: 'Erreur récupération notes' });
        }
    },

    // Récupérer les notes d'un cours
    getCourseGrades: async (req, res) => {
        try {
            const [grades] = await pool.query(`
        SELECT g.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Grades g
        JOIN Students s ON g.student_id = s.student_id
        JOIN Teachers t ON g.recorded_by = t.teacher_id
        WHERE g.course_id = ?
        ORDER BY s.last_name, s.first_name
      `, [req.params.course_id]);

            res.json(grades);
        } catch (error) {
            console.error('Erreur récupération notes cours:', error);
            res.status(500).json({ message: 'Erreur récupération notes cours' });
        }
    },

    // Mettre à jour une note
    updateGrade: async (req, res) => {
        const { id } = req.params;
        const { grade, grade_type, comments } = req.body;

        try {
            // Validation de la note
            if (grade && (grade < 0 || grade > 20)) {
                return res.status(400).json({ message: 'La note doit être entre 0 et 20' });
            }

            const [result] = await pool.query(
                `UPDATE Grades SET
        grade = COALESCE(?, grade),
        grade_type = COALESCE(?, grade_type),
        comments = COALESCE(?, comments)
        WHERE grade_id = ?`,
                [grade, grade_type, comments, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Note non trouvée' });
            }

            const [updatedGrade] = await pool.query(`
        SELECT g.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        c.course_id, sub.subject_name
        FROM Grades g
        JOIN Students s ON g.student_id = s.student_id
        JOIN Courses c ON g.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        WHERE g.grade_id = ?
      `, [id]);

            res.json(updatedGrade[0]);
        } catch (error) {
            console.error('Erreur mise à jour note:', error);
            res.status(500).json({ message: 'Erreur mise à jour note' });
        }
    },

    // Supprimer une note
    deleteGrade: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Grades WHERE grade_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Note non trouvée' });
            }

            res.json({ message: 'Note supprimée avec succès' });
        } catch (error) {
            console.error('Erreur suppression note:', error);
            res.status(500).json({ message: 'Erreur suppression note' });
        }
    },

    // Calculer la moyenne d'un étudiant dans un cours
    getStudentCourseAverage: async (req, res) => {
        try {
            const [result] = await pool.query(`
        SELECT AVG(grade) as average
        FROM Grades
        WHERE student_id = ? AND course_id = ?
      `, [req.params.student_id, req.params.course_id]);

            res.json({
                average: result[0].average ? parseFloat(result[0].average).toFixed(2) : null
            });
        } catch (error) {
            console.error('Erreur calcul moyenne:', error);
            res.status(500).json({ message: 'Erreur calcul moyenne' });
        }
    }
};

module.exports = gradeController;