const pool = require('../databases/db');
const { validateTimeSlot } = require('../middlewares/validation');

const timetableController = {
    // Créer un nouvel horaire
    createTimetableEntry: async (req, res) => {
        const { course_id, day_of_week, start_time, end_time, classroom, recurrence, valid_from, valid_until } = req.body;

        try {
            // Validation du cours
            const [course] = await pool.query('SELECT course_id FROM Courses WHERE course_id = ?', [course_id]);
            if (!course.length) {
                return res.status(400).json({ message: 'Cours non trouvé' });
            }

            // Validation des conflits d'horaire
            const timeConflict = await validateTimeSlot(
                course_id,
                day_of_week,
                start_time,
                end_time,
                classroom,
                recurrence,
                valid_from,
                valid_until
            );

            if (timeConflict) {
                return res.status(409).json({
                    message: 'Conflit d\'horaire détecté',
                    conflict: timeConflict
                });
            }

            const [result] = await pool.query(
                `INSERT INTO Timetable 
        (course_id, day_of_week, start_time, end_time, classroom, recurrence, valid_from, valid_until) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [course_id, day_of_week, start_time, end_time, classroom, recurrence || 'Weekly', valid_from, valid_until]
            );

            const [newEntry] = await pool.query(`
        SELECT t.*, 
        c.course_id, sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name,
        cl.class_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE t.timetable_id = ?
      `, [result.insertId]);

            res.status(201).json(newEntry[0]);
        } catch (error) {
            console.error('Erreur création horaire:', error);
            res.status(500).json({ message: 'Erreur création horaire' });
        }
    },

    // Récupérer tous les horaires
    getAllTimetableEntries: async (req, res) => {
        try {
            const [entries] = await pool.query(`
        SELECT t.*, 
        c.course_id, sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name,
        cl.class_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        ORDER BY t.day_of_week, t.start_time
      `);
            res.json(entries);
        } catch (error) {
            console.error('Erreur récupération horaires:', error);
            res.status(500).json({ message: 'Erreur récupération horaires' });
        }
    },

    // Récupérer les horaires d'un cours
    getTimetableByCourse: async (req, res) => {
        try {
            const [entries] = await pool.query(`
        SELECT t.*, 
        sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name,
        cl.class_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE t.course_id = ?
        ORDER BY t.day_of_week, t.start_time
      `, [req.params.course_id]);

            res.json(entries);
        } catch (error) {
            console.error('Erreur récupération horaires cours:', error);
            res.status(500).json({ message: 'Erreur récupération horaires cours' });
        }
    },

    // Récupérer l'emploi du temps d'une classe
    getClassTimetable: async (req, res) => {
        try {
            const [entries] = await pool.query(`
        SELECT t.*, 
        sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        WHERE c.class_id = ?
        ORDER BY t.day_of_week, t.start_time
      `, [req.params.class_id]);

            res.json(entries);
        } catch (error) {
            console.error('Erreur récupération EDT classe:', error);
            res.status(500).json({ message: 'Erreur récupération EDT classe' });
        }
    },

    // Mettre à jour un horaire
    updateTimetableEntry: async (req, res) => {
        const { id } = req.params;
        const { day_of_week, start_time, end_time, classroom, recurrence, valid_from, valid_until } = req.body;

        try {
            // Récupérer le cours associé
            const [timetable] = await pool.query('SELECT course_id FROM Timetable WHERE timetable_id = ?', [id]);
            if (!timetable.length) {
                return res.status(404).json({ message: 'Horaire non trouvé' });
            }

            // Validation des conflits (exclure l'entrée actuelle)
            const timeConflict = await validateTimeSlot(
                timetable[0].course_id,
                day_of_week,
                start_time,
                end_time,
                classroom,
                recurrence,
                valid_from,
                valid_until,
                id // Exclure cette entrée de la vérification
            );

            if (timeConflict) {
                return res.status(409).json({
                    message: 'Conflit d\'horaire détecté',
                    conflict: timeConflict
                });
            }

            const [result] = await pool.query(
                `UPDATE Timetable SET
        day_of_week = COALESCE(?, day_of_week),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        classroom = COALESCE(?, classroom),
        recurrence = COALESCE(?, recurrence),
        valid_from = COALESCE(?, valid_from),
        valid_until = COALESCE(?, valid_until)
        WHERE timetable_id = ?`,
                [day_of_week, start_time, end_time, classroom, recurrence, valid_from, valid_until, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Horaire non trouvé' });
            }

            const [updatedEntry] = await pool.query(`
        SELECT t.*, 
        c.course_id, sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name,
        cl.class_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        JOIN Classes cl ON c.class_id = cl.class_id
        WHERE t.timetable_id = ?
      `, [id]);

            res.json(updatedEntry[0]);
        } catch (error) {
            console.error('Erreur mise à jour horaire:', error);
            res.status(500).json({ message: 'Erreur mise à jour horaire' });
        }
    },

    // Supprimer un horaire
    deleteTimetableEntry: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Timetable WHERE timetable_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Horaire non trouvé' });
            }

            res.json({ message: 'Horaire supprimé avec succès' });
        } catch (error) {
            console.error('Erreur suppression horaire:', error);
            res.status(500).json({ message: 'Erreur suppression horaire' });
        }
    },

    // Récupérer l'emploi du temps actuel
    getCurrentTimetable: async (req, res) => {
        const { class_id } = req.params;
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            const [entries] = await pool.query(`
        SELECT t.*, 
        sub.subject_name,
        tea.first_name as teacher_first_name, tea.last_name as teacher_last_name
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        WHERE c.class_id = ?
        AND (t.valid_from IS NULL OR t.valid_from <= ?)
        AND (t.valid_until IS NULL OR t.valid_until >= ?)
        ORDER BY t.day_of_week, t.start_time
      `, [class_id, currentDate, currentDate]);

            res.json(entries);
        } catch (error) {
            console.error('Erreur récupération EDT actuel:', error);
            res.status(500).json({ message: 'Erreur récupération EDT actuel' });
        }
    }
};

module.exports = timetableController;