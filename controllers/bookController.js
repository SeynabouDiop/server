const pool = require('../databases/db');
const { validateBookData } = require('../middlewares/validationBooks');

const bookController = {
    // Ajouter un nouveau livre
    createBook: async (req, res) => {
        const {
            title,
            author,
            isbn,
            publisher,
            publication_year,
            edition,
            quantity_total,
            category,
            location
        } = req.body;

        try {
            // Validation des données
            const validationError = validateBookData(req.body);
            if (validationError) {
                return res.status(400).json(validationError);
            }

            // Calculer la quantité disponible
            const quantity_available = quantity_total || 1;

            const [result] = await pool.query(
                `INSERT INTO Books 
        (title, author, isbn, publisher, publication_year, edition, quantity_total, quantity_available, category, location) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, author, isbn, publisher || null, publication_year || null, edition || null,
                    quantity_total || 1, quantity_available, category || null, location || null]
            );

            const [newBook] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [result.insertId]);

            res.status(201).json(newBook[0]);
        } catch (error) {
            console.error('Erreur création livre:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Un livre avec cet ISBN existe déjà' });
            }
            res.status(500).json({ message: 'Erreur création livre' });
        }
    },

    // Récupérer tous les livres
    getAllBooks: async (req, res) => {
        try {
            const [books] = await pool.query(`
        SELECT * FROM Books 
        ORDER BY title
      `);
            res.json(books);
        } catch (error) {
            console.error('Erreur récupération livres:', error);
            res.status(500).json({ message: 'Erreur récupération livres' });
        }
    },

    // Récupérer un livre par ID
    getBookById: async (req, res) => {
        try {
            const [book] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [req.params.id]);

            if (book.length === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }

            res.json(book[0]);
        } catch (error) {
            console.error('Erreur récupération livre:', error);
            res.status(500).json({ message: 'Erreur récupération livre' });
        }
    },

    // Rechercher des livres
    searchBooks: async (req, res) => {
        const { query } = req.query;

        try {
            const [books] = await pool.query(`
        SELECT * FROM Books 
        WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?
        ORDER BY title
      `, [`%${query}%`, `%${query}%`, `%${query}%`]);

            res.json(books);
        } catch (error) {
            console.error('Erreur recherche livres:', error);
            res.status(500).json({ message: 'Erreur recherche livres' });
        }
    },

    // Mettre à jour un livre
    updateBook: async (req, res) => {
        const { id } = req.params;
        const {
            title,
            author,
            isbn,
            publisher,
            publication_year,
            edition,
            quantity_total,
            quantity_available,
            category,
            location
        } = req.body;

        try {
            // Vérifier si le livre existe
            const [existingBook] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [id]);
            if (existingBook.length === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }

            // Validation des données
            const validationError = validateBookData(req.body, true);
            if (validationError) {
                return res.status(400).json(validationError);
            }

            // Calculer la nouvelle quantité disponible si quantity_total est modifié
            let newQuantityAvailable = quantity_available;
            if (quantity_total && !quantity_available) {
                const diff = quantity_total - existingBook[0].quantity_total;
                newQuantityAvailable = existingBook[0].quantity_available + diff;
            }

            const [result] = await pool.query(
                `UPDATE Books SET
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        isbn = COALESCE(?, isbn),
        publisher = COALESCE(?, publisher),
        publication_year = COALESCE(?, publication_year),
        edition = COALESCE(?, edition),
        quantity_total = COALESCE(?, quantity_total),
        quantity_available = COALESCE(?, quantity_available),
        category = COALESCE(?, category),
        location = COALESCE(?, location)
        WHERE book_id = ?`,
                [title, author, isbn, publisher, publication_year, edition,
                    quantity_total, newQuantityAvailable, category, location, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }

            const [updatedBook] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [id]);
            res.json(updatedBook[0]);
        } catch (error) {
            console.error('Erreur mise à jour livre:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Un livre avec cet ISBN existe déjà' });
            }
            res.status(500).json({ message: 'Erreur mise à jour livre' });
        }
    },

    // Supprimer un livre
    deleteBook: async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM Books WHERE book_id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }

            res.json({ message: 'Livre supprimé avec succès' });
        } catch (error) {
            console.error('Erreur suppression livre:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    message: 'Impossible de supprimer : ce livre est référencé dans d\'autres tables'
                });
            }
            res.status(500).json({ message: 'Erreur suppression livre' });
        }
    },

    // Mettre à jour les quantités
    updateBookQuantity: async (req, res) => {
        const { id } = req.params;
        const { change, action } = req.body; // action: 'add' ou 'remove'

        try {
            const [book] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [id]);
            if (book.length === 0) {
                return res.status(404).json({ message: 'Livre non trouvé' });
            }

            let newQuantityAvailable = book[0].quantity_available;

            if (action === 'add') {
                newQuantityAvailable += change;
            } else if (action === 'remove') {
                newQuantityAvailable -= change;
            } else {
                return res.status(400).json({ message: 'Action invalide' });
            }

            // Validation de la quantité
            if (newQuantityAvailable < 0 || newQuantityAvailable > book[0].quantity_total) {
                return res.status(400).json({
                    message: 'Quantité invalide',
                    max: book[0].quantity_total,
                    min: 0
                });
            }

            await pool.query(
                'UPDATE Books SET quantity_available = ? WHERE book_id = ?',
                [newQuantityAvailable, id]
            );

            const [updatedBook] = await pool.query('SELECT * FROM Books WHERE book_id = ?', [id]);
            res.json(updatedBook[0]);
        } catch (error) {
            console.error('Erreur mise à jour quantité:', error);
            res.status(500).json({ message: 'Erreur mise à jour quantité' });
        }
    }
};

module.exports = bookController;