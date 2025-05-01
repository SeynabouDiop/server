const validateParent = (req, res, next) => {
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name || !phone) {
        return res.status(400).json({
            message: 'Les champs first_name, last_name et phone sont obligatoires'
        });
    }

    if (phone.length < 8) {
        return res.status(400).json({
            message: 'Le numéro de téléphone doit contenir au moins 8 caractères'
        });
    }

    next();
};

module.exports = {
    validateParent
};