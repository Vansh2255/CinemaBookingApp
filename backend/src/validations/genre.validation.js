const Joi = require('joi');

const createGenreSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
});

const updateGenreSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50)
});

module.exports = {
    createGenreSchema,
    updateGenreSchema
};