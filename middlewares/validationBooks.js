const validateBookData = (bookData, isUpdate = false) => {
    const { title, author, isbn, publication_year, quantity_total, quantity_available } = bookData;

    if (!isUpdate) {
        if (!title || !author) {
            return {
                message: 'Titre et auteur sont obligatoires',
                required: ['title', 'author']
            };
        }
    }

    if (title && title.length > 100) {
        return { message: 'Le titre ne doit pas dépasser 100 caractères' };
    }

    if (author && author.length > 100) {
        return { message: 'Le nom de l\'auteur ne doit pas dépasser 100 caractères' };
    }

    if (isbn && isbn.length > 20) {
        return { message: 'L\'ISBN ne doit pas dépasser 20 caractères' };
    }

    if (publication_year && (publication_year < 1000 || publication_year > new Date().getFullYear())) {
        return { message: 'Année de publication invalide' };
    }

    if (quantity_total && quantity_total < 1) {
        return { message: 'La quantité totale doit être au moins 1' };
    }

    if (quantity_available && (quantity_available < 0 || quantity_available > quantity_total)) {
        return {
            message: 'La quantité disponible doit être entre 0 et la quantité totale',
            max: quantity_total
        };
    }

    return null;
};

module.exports = { validateBookData };