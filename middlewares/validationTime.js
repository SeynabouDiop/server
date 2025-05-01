const pool = require('../databases/db');

const validateTimeSlot = async (
    course_id,
    day_of_week,
    start_time,
    end_time,
    classroom,
    recurrence,
    valid_from,
    valid_until,
    exclude_id = null
) => {
    try {
        // Vérifier les conflits de salle
        if (classroom) {
            const [classroomConflicts] = await pool.query(`
        SELECT t.*, sub.subject_name, tea.first_name, tea.last_name 
        FROM Timetable t
        JOIN Courses c ON t.course_id = c.course_id
        JOIN Subjects sub ON c.subject_id = sub.subject_id
        JOIN Teachers tea ON c.teacher_id = tea.teacher_id
        WHERE t.classroom = ?
        AND t.day_of_week = ?
        AND (
          (t.start_time < ? AND t.end_time > ?) OR
          (t.start_time < ? AND t.end_time > ?) OR
          (t.start_time >= ? AND t.end_time <= ?)
        )
        AND (? IS NULL OR t.recurrence = ? OR t.recurrence = 'Weekly')
        AND (t.valid_from IS NULL OR ? IS NULL OR t.valid_from <= ?)
        AND (t.valid_until IS NULL OR ? IS NULL OR t.valid_until >= ?)
        ${exclude_id ? 'AND t.timetable_id != ?' : ''}
      `, [
                classroom, day_of_week,
                end_time, start_time,
                start_time, end_time,
                start_time, end_time,
                recurrence, recurrence,
                valid_until, valid_until,
                valid_from, valid_from,
                ...(exclude_id ? [exclude_id] : [])
            ]);

            if (classroomConflicts.length > 0) {
                return {
                    type: 'classroom',
                    conflicts: classroomConflicts
                };
            }
        }

        // Vérifier les conflits d'enseignant
        const [teacherConflicts] = await pool.query(`
      SELECT t.*, sub.subject_name, cl.class_name 
      FROM Timetable t
      JOIN Courses c ON t.course_id = c.course_id
      JOIN Subjects sub ON c.subject_id = sub.subject_id
      JOIN Classes cl ON c.class_id = cl.class_id
      WHERE c.teacher_id = (SELECT teacher_id FROM Courses WHERE course_id = ?)
      AND t.day_of_week = ?
      AND (
        (t.start_time < ? AND t.end_time > ?) OR
        (t.start_time < ? AND t.end_time > ?) OR
        (t.start_time >= ? AND t.end_time <= ?)
      )
      AND (? IS NULL OR t.recurrence = ? OR t.recurrence = 'Weekly')
      AND (t.valid_from IS NULL OR ? IS NULL OR t.valid_from <= ?)
      AND (t.valid_until IS NULL OR ? IS NULL OR t.valid_until >= ?)
      ${exclude_id ? 'AND t.timetable_id != ?' : ''}
    `, [
            course_id, day_of_week,
            end_time, start_time,
            start_time, end_time,
            start_time, end_time,
            recurrence, recurrence,
            valid_until, valid_until,
            valid_from, valid_from,
            ...(exclude_id ? [exclude_id] : [])
        ]);

        if (teacherConflicts.length > 0) {
            return {
                type: 'teacher',
                conflicts: teacherConflicts
            };
        }

        return null;
    } catch (error) {
        console.error('Erreur validation créneau:', error);
        throw error;
    }
};

module.exports = { validateTimeSlot };