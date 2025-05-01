const pool = require('../databases/db');

const attendanceController = {
    // Enregistrer une présence
    recordAttendance: async (req, res) => {
        const { student_id, course_id, date, status, justification, recorded_by } = req.body;

        try {
            // Validation des références
            const [student] = await pool.query('SELECT student_id FROM Students WHERE student_id = ?', [student_id]);
            const [course] = await pool.query('SELECT course_id FROM Courses WHERE course_id = ?', [course_id]);
            const [teacher] = await pool.query('SELECT teacher_id FROM Teachers WHERE teacher_id = ?', [recorded_by]);

            if (!student.length || !course.length || !teacher.length) {
                return res.status(400).json({ message: 'Étudiant, cours ou enseignant invalide' });
            }

            // Vérifier si l'enregistrement existe déjà
            const [existing] = await pool.query(
                'SELECT * FROM Attendance WHERE student_id = ? AND course_id = ? AND date = ?',
                [student_id, course_id, date]
            );

            if (existing.length > 0) {
                return res.status(409).json({ message: 'Une entrée existe déjà pour cet étudiant, cours et date' });
            }

            const [result] = await pool.query(
                `INSERT INTO Attendance 
        (student_id, course_id, date, status, justification, recorded_by) 
        VALUES (?, ?, ?, ?, ?, ?)`,
                [student_id, course_id, date, status, justification, recorded_by]
            );

            const [newRecord] = await pool.query(`
        SELECT a.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        c.course_id, sub.subject_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Attendance a
        JOIN Students s ON a.student_id = s.student_id
        JOIN Courses c ON a.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers t ON a.recorded_by = t.teacher_id
        WHERE a.attendance_id = ?
      `, [result.insertId]);

            res.status(201).json(newRecord[0]);
        } catch (error) {
            console.error('Erreur enregistrement présence:', error);
            res.status(500).json({ message: 'Erreur enregistrement présence' });
        }
    },

    // Récupérer les présences d'un étudiant
    getStudentAttendance: async (req, res) => {
        try {
            const [attendance] = await pool.query(`
        SELECT a.*, 
        c.course_id, sub.subject_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Attendance a
        JOIN Courses c ON a.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers t ON a.recorded_by = t.teacher_id
        WHERE a.student_id = ?
        ORDER BY a.date DESC
      `, [req.params.student_id]);

            res.json(attendance);
        } catch (error) {
            console.error('Erreur récupération présences:', error);
            res.status(500).json({ message: 'Erreur récupération présences' });
        }
    },

    // Récupérer les présences d'un cours à une date
    getCourseAttendance: async (req, res) => {
        const { course_id, date } = req.params;

        try {
            const [attendance] = await pool.query(`
        SELECT a.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM Attendance a
        JOIN Students s ON a.student_id = s.student_id
        JOIN Teachers t ON a.recorded_by = t.teacher_id
        WHERE a.course_id = ? AND a.date = ?
        ORDER BY s.last_name, s.first_name
      `, [course_id, date]);

            res.json(attendance);
        } catch (error) {
            console.error('Erreur récupération présences cours:', error);
            res.status(500).json({ message: 'Erreur récupération présences cours' });
        }
    },

    // Mettre à jour une présence
    updateAttendance: async (req, res) => {
        const { id } = req.params;
        const { status, justification } = req.body;

        try {
            const [result] = await pool.query(
                `UPDATE Attendance SET
        status = COALESCE(?, status),
        justification = COALESCE(?, justification)
        WHERE attendance_id = ?`,
                [status, justification, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Enregistrement non trouvé' });
            }

            const [updatedRecord] = await pool.query(`
        SELECT a.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        c.course_id, sub.subject_name
        FROM Attendance a
        JOIN Students s ON a.student_id = s.student_id
        JOIN Courses c ON a.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        WHERE a.attendance_id = ?
      `, [id]);

            res.json(updatedRecord[0]);
        } catch (error) {
            console.error('Erreur mise à jour présence:', error);
            res.status(500).json({ message: 'Erreur mise à jour présence' });
        }
    },

    // Supprimer une présence
    deleteAttendance: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Attendance WHERE attendance_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Enregistrement non trouvé' });
            }

            res.json({ message: 'Enregistrement supprimé avec succès' });
        } catch (error) {
            console.error('Erreur suppression présence:', error);
            res.status(500).json({ message: 'Erreur suppression présence' });
        }
    },

    // Statistiques de présence
    getAttendanceStats: async (req, res) => {
        const { student_id, course_id } = req.params;

        try {
            const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(status = 'Present') as present,
          SUM(status = 'Absent') as absent,
          SUM(status = 'Late') as late,
          SUM(status = 'Excused') as excused
        FROM Attendance
        WHERE student_id = ? AND course_id = ?
      `, [student_id, course_id]);

            res.json(stats[0]);
        } catch (error) {
            console.error('Erreur calcul statistiques:', error);
            res.status(500).json({ message: 'Erreur calcul statistiques' });
        }
    }
};

module.exports = attendanceController;