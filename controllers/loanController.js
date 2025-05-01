const pool = require('../databases/db');
const { validateLoanData } = require('../middlewares/validationLoans');

const loanController = {
    // Créer un nouvel emprunt
    createLoan: async (req, res) => {
        const { book_id, student_id, loan_date, due_date, processed_by } = req.body;

        try {
            // Validation des données
            const validationError = validateLoanData(req.body);
            if (validationError) {
                return res.status(400).json(validationError);
            }

            // Vérifier la disponibilité du livre
            const [book] = await pool.query('SELECT quantity_available FROM Books WHERE book_id = ?', [book_id]);
            if (book.length === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }
            if (book[0].quantity_available < 1) {
                return res.status(400).json({ message: 'Ce livre n\'est pas disponible' });
            }

            // Vérifier l'étudiant
            const [student] = await pool.query('SELECT student_id FROM Students WHERE student_id = ?', [student_id]);
            if (student.length === 0) {
                return res.status(404).json({ message: 'Étudiant non trouvé' });
            }

            // Vérifier l'utilisateur qui traite
            if (processed_by) {
                const [user] = await pool.query('SELECT user_id FROM Users WHERE user_id = ?', [processed_by]);
                if (user.length === 0) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
            }

            // Créer l'emprunt
            const [result] = await pool.query(
                `INSERT INTO Loans 
        (book_id, student_id, loan_date, due_date, status, processed_by) 
        VALUES (?, ?, ?, ?, 'Active', ?)`,
                [book_id, student_id, loan_date, due_date, processed_by || null]
            );

            // Mettre à jour la quantité disponible
            await pool.query(
                'UPDATE Books SET quantity_available = quantity_available - 1 WHERE book_id = ?',
                [book_id]
            );

            const [newLoan] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author,
        s.first_name as student_first_name, s.last_name as student_last_name,
        u.username as processed_by_username
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Students s ON l.student_id = s.student_id
        LEFT JOIN Users u ON l.processed_by = u.user_id
        WHERE l.loan_id = ?
      `, [result.insertId]);

            res.status(201).json(newLoan[0]);
        } catch (error) {
            console.error('Erreur création emprunt:', error);
            res.status(500).json({ message: 'Erreur création emprunt' });
        }
    },

    // Récupérer tous les emprunts
    getAllLoans: async (req, res) => {
        try {
            const [loans] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author,
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Students s ON l.student_id = s.student_id
        ORDER BY l.loan_date DESC
      `);
            res.json(loans);
        } catch (error) {
            console.error('Erreur récupération emprunts:', error);
            res.status(500).json({ message: 'Erreur récupération emprunts' });
        }
    },

    // Récupérer un emprunt par ID
    getLoanById: async (req, res) => {
        try {
            const [loan] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author, b.isbn as book_isbn,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email,
        u.username as processed_by_username
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Students s ON l.student_id = s.student_id
        LEFT JOIN Users u ON l.processed_by = u.user_id
        WHERE l.loan_id = ?
      `, [req.params.id]);

            if (loan.length === 0) {
                return res.status(404).json({ message: 'Emprunt non trouvé' });
            }

            res.json(loan[0]);
        } catch (error) {
            console.error('Erreur récupération emprunt:', error);
            res.status(500).json({ message: 'Erreur récupération emprunt' });
        }
    },

    // Récupérer les emprunts d'un étudiant
    getStudentLoans: async (req, res) => {
        try {
            const [loans] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        WHERE l.student_id = ?
        ORDER BY l.loan_date DESC
      `, [req.params.student_id]);

            res.json(loans);
        } catch (error) {
            console.error('Erreur récupération emprunts étudiant:', error);
            res.status(500).json({ message: 'Erreur récupération emprunts étudiant' });
        }
    },

    // Récupérer les emprunts actifs
    getActiveLoans: async (req, res) => {
        try {
            const [loans] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author,
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Students s ON l.student_id = s.student_id
        WHERE l.status = 'Active'
        ORDER BY l.due_date ASC
      `);
            res.json(loans);
        } catch (error) {
            console.error('Erreur récupération emprunts actifs:', error);
            res.status(500).json({ message: 'Erreur récupération emprunts actifs' });
        }
    },

    // Retourner un livre
    returnBook: async (req, res) => {
        const { id } = req.params;
        const { return_date, status, processed_by } = req.body;

        try {
            // Vérifier l'emprunt
            const [loan] = await pool.query('SELECT * FROM Loans WHERE loan_id = ?', [id]);
            if (loan.length === 0) {
                return res.status(404).json({ message: 'Emprunt non trouvé' });
            }
            if (loan[0].status !== 'Active') {
                return res.status(400).json({ message: 'Cet emprunt est déjà clôturé' });
            }

            // Validation des données
            if (!return_date) {
                return res.status(400).json({ message: 'La date de retour est obligatoire' });
            }

            // Mettre à jour l'emprunt
            const [result] = await pool.query(
                `UPDATE Loans SET
        return_date = ?,
        status = COALESCE(?, 'Returned'),
        processed_by = COALESCE(?, processed_by)
        WHERE loan_id = ?`,
                [return_date, status, processed_by, id]
            );

            // Mettre à jour la quantité disponible du livre
            await pool.query(
                'UPDATE Books SET quantity_available = quantity_available + 1 WHERE book_id = ?',
                [loan[0].book_id]
            );

            const [updatedLoan] = await pool.query(`
        SELECT l.*, 
        b.title as book_title, b.author as book_author,
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Loans l
        JOIN Books b ON l.book_id = b.book_id
        JOIN Students s ON l.student_id = s.student_id
        WHERE l.loan_id = ?
      `, [id]);

            res.json(updatedLoan[0]);
        } catch (error) {
            console.error('Erreur retour livre:', error);
            res.status(500).json({ message: 'Erreur retour livre' });
        }
    },

    // Mettre à jour le statut d'un emprunt
    updateLoanStatus: async (req, res) => {
        const { id } = req.params;
        const { status, processed_by } = req.body;

        try {
            // Vérifier l'emprunt
            const [loan] = await pool.query('SELECT * FROM Loans WHERE loan_id = ?', [id]);
            if (loan.length === 0) {
                return res.status(404).json({ message: 'Emprunt non trouvé' });
            }

            // Validation du statut
            if (!status || !['Active', 'Returned', 'Overdue', 'Lost'].includes(status)) {
                return res.status(400).json({ message: 'Statut invalide' });
            }

            // Vérifier l'utilisateur qui traite
            if (processed_by) {
                const [user] = await pool.query('SELECT user_id FROM Users WHERE user_id = ?', [processed_by]);
                if (user.length === 0) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' });
                }
            }

            // Si le statut passe à Returned et que return_date n'est pas défini
            if (status === 'Returned' && !loan[0].return_date) {
                await pool.query(
                    'UPDATE Loans SET return_date = CURRENT_DATE WHERE loan_id = ?',
                    [id]
                );
            }

            // Mettre à jour le statut
            const [result] = await pool.query(
                `UPDATE Loans SET
        status = ?,
        processed_by = COALESCE(?, processed_by)
        WHERE loan_id = ?`,
                [status, processed_by, id]
            );

            // Si le livre est marqué comme perdu et était actif
            if (status === 'Lost' && loan[0].status === 'Active') {
                await pool.query(
                    'UPDATE Books SET quantity_total = quantity_total - 1 WHERE book_id = ?',
                    [loan[0].book_id]
                );
            }

            const [updatedLoan] = await pool.query('SELECT * FROM Loans WHERE loan_id = ?', [id]);
            res.json(updatedLoan[0]);
        } catch (error) {
            console.error('Erreur mise à jour statut:', error);
            res.status(500).json({ message: 'Erreur mise à jour statut' });
        }
    },

    // Vérifier les emprunts en retard
    checkOverdueLoans: async (req, res) => {
        try {
            // Marquer les emprunts en retard
            const [result] = await pool.query(`
        UPDATE Loans 
        SET status = 'Overdue'
        WHERE status = 'Active' 
        AND due_date < CURRENT_DATE
      `);

            res.json({
                message: `${result.affectedRows} emprunt(s) marqué(s) comme en retard`
            });
        } catch (error) {
            console.error('Erreur vérification emprunts en retard:', error);
            res.status(500).json({ message: 'Erreur vérification emprunts en retard' });
        }
    }
};

module.exports = loanController;