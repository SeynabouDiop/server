const validateAnnouncement = (announcementData, isUpdate = false) => {
    const { title, content, author_id, target_audience, start_date, end_date } = announcementData;

    if (!isUpdate) {
        if (!title || !content || !author_id || !target_audience || !start_date || !end_date) {
            return {
                message: 'Données manquantes',
                required: ['title', 'content', 'author_id', 'target_audience', 'start_date', 'end_date']
            };
        }
    }

    if (title && title.length > 100) {
        return { message: 'Le titre ne doit pas dépasser 100 caractères' };
    }

    if (content && content.length > 5000) {
        return { message: 'Le contenu est trop long' };
    }

    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
        return { message: 'La date de fin doit être après la date de début' };
    }

    if (target_audience && !['All', 'Teachers', 'Students', 'Parents', 'Class'].includes(target_audience)) {
        return { message: 'Public cible invalide' };
    }

    return null;
};

module.exports = { validateAnnouncement };