const pool = require('../databases/db');
const { generateInvoiceNumber } = require('../utils/helpers');

const paymentController = {
    // Créer un nouveau paiement
    createPayment: async (req, res) => {
        const { student_id, amount, payment_date, due_date, status, payment_method, description, recorded_by } = req.body;

        try {
            // Validation de l'étudiant
            const [student] = await pool.query('SELECT student_id FROM Students WHERE student_id = ?', [student_id]);
            if (!student.length) {
                return res.status(400).json({ message: 'Étudiant non trouvé' });
            }

            // Validation de l'utilisateur qui enregistre
            if (recorded_by) {
                const [user] = await pool.query('SELECT user_id FROM Users WHERE user_id = ?', [recorded_by]);
                if (!user.length) {
                    return res.status(400).json({ message: 'Utilisateur non trouvé' });
                }
            }

            // Générer un numéro de facture unique
            const invoice_number = await generateInvoiceNumber();

            const [result] = await pool.query(
                `INSERT INTO Payments 
        (student_id, amount, payment_date, due_date, status, payment_method, invoice_number, description, recorded_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [student_id, amount, payment_date || null, due_date, status, payment_method || null, invoice_number, description || null, recorded_by || null]
            );

            const [newPayment] = await pool.query(`
        SELECT p.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        u.username as recorded_by_username
        FROM Payments p
        JOIN Students s ON p.student_id = s.student_id
        LEFT JOIN Users u ON p.recorded_by = u.user_id
        WHERE p.payment_id = ?
      `, [result.insertId]);

            res.status(201).json(newPayment[0]);
        } catch (error) {
            console.error('Erreur création paiement:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Numéro de facture déjà existant' });
            }
            res.status(500).json({ message: 'Erreur création paiement' });
        }
    },

    // Récupérer tous les paiements
    getAllPayments: async (req, res) => {
        try {
            const [payments] = await pool.query(`
        SELECT p.*, 
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Payments p
        JOIN Students s ON p.student_id = s.student_id
        ORDER BY p.payment_date DESC
      `);
            res.json(payments);
        } catch (error) {
            console.error('Erreur récupération paiements:', error);
            res.status(500).json({ message: 'Erreur récupération paiements' });
        }
    },

    // Récupérer les paiements d'un étudiant
    getStudentPayments: async (req, res) => {
        try {
            const [payments] = await pool.query(`
        SELECT p.*
        FROM Payments p
        WHERE p.student_id = ?
        ORDER BY p.payment_date DESC
      `, [req.params.student_id]);

            res.json(payments);
        } catch (error) {
            console.error('Erreur récupération paiements étudiant:', error);
            res.status(500).json({ message: 'Erreur récupération paiements étudiant' });
        }
    },

    // Récupérer un paiement par ID
    getPaymentById: async (req, res) => {
        try {
            const [payment] = await pool.query(`
        SELECT p.*, 
        s.first_name as student_first_name, s.last_name as student_last_name,
        u.username as recorded_by_username
        FROM Payments p
        JOIN Students s ON p.student_id = s.student_id
        LEFT JOIN Users u ON p.recorded_by = u.user_id
        WHERE p.payment_id = ?
      `, [req.params.id]);

            if (payment.length === 0) {
                return res.status(404).json({ message: 'Paiement non trouvé' });
            }

            res.json(payment[0]);
        } catch (error) {
            console.error('Erreur récupération paiement:', error);
            res.status(500).json({ message: 'Erreur récupération paiement' });
        }
    },

    // Mettre à jour un paiement
    updatePayment: async (req, res) => {
        const { id } = req.params;
        const { amount, payment_date, status, payment_method, description } = req.body;

        try {
            const [result] = await pool.query(
                `UPDATE Payments SET
        amount = COALESCE(?, amount),
        payment_date = COALESCE(?, payment_date),
        status = COALESCE(?, status),
        payment_method = COALESCE(?, payment_method),
        description = COALESCE(?, description)
        WHERE payment_id = ?`,
                [amount, payment_date, status, payment_method, description, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Paiement non trouvé' });
            }

            const [updatedPayment] = await pool.query(`
        SELECT p.*, 
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Payments p
        JOIN Students s ON p.student_id = s.student_id
        WHERE p.payment_id = ?
      `, [id]);

            res.json(updatedPayment[0]);
        } catch (error) {
            console.error('Erreur mise à jour paiement:', error);
            res.status(500).json({ message: 'Erreur mise à jour paiement' });
        }
    },

    // Supprimer un paiement
    deletePayment: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Payments WHERE payment_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Paiement non trouvé' });
            }

            res.json({ message: 'Paiement supprimé avec succès' });
        } catch (error) {
            console.error('Erreur suppression paiement:', error);
            res.status(500).json({ message: 'Erreur suppression paiement' });
        }
    },

    // Générer un rapport de paiements
    getPaymentsReport: async (req, res) => {
        const { start_date, end_date, status } = req.query;

        try {
            let query = `
        SELECT p.*, 
        s.first_name as student_first_name, s.last_name as student_last_name
        FROM Payments p
        JOIN Students s ON p.student_id = s.student_id
        WHERE 1=1
      `;
            const params = [];

            if (start_date) {
                query += ' AND p.payment_date >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND p.payment_date <= ?';
                params.push(end_date);
            }

            if (status) {
                query += ' AND p.status = ?';
                params.push(status);
            }

            query += ' ORDER BY p.payment_date DESC';

            const [payments] = await pool.query(query, params);

            // Calculer les totaux
            const total = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
            const paid = payments.filter(p => p.status === 'Paid').reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
            const pending = payments.filter(p => p.status === 'Pending').reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

            res.json({
                payments,
                summary: {
                    total_payments: payments.length,
                    total_amount: total.toFixed(2),
                    paid_amount: paid.toFixed(2),
                    pending_amount: pending.toFixed(2)
                }
            });
        } catch (error) {
            console.error('Erreur génération rapport:', error);
            res.status(500).json({ message: 'Erreur génération rapport' });
        }
    }
};

module.exports = paymentController;