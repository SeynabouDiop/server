const validateLoanData = (loanData) => {
    const { book_id, student_id, loan_date, due_date } = loanData;

    if (!book_id || !student_id || !loan_date || !due_date) {
        return {
            message: 'Données manquantes',
            required: ['book_id', 'student_id', 'loan_date', 'due_date']
        };
    }

    if (new Date(due_date) <= new Date(loan_date)) {
        return { message: 'La date de retour doit être après la date d\'emprunt' };
    }

    return null;
};

module.exports = { validateLoanData };