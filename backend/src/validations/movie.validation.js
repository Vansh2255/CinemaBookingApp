const Joi = require("joi");

const createMovieSchema = Joi.object({
    title: Joi.string().min(2).max(150).required(),

    description: Joi.string().allow("").optional(),

    poster_url: Joi.string().uri().optional(),

    duration: Joi.number().integer().min(1).required(),

    language: Joi.string().required(),

    release_date: Joi.date().required()
});

const updateMovieSchema = Joi.object({
    title: Joi.string().min(2).max(150).optional(),

    description: Joi.string().allow("").optional(),

    poster_url: Joi.string().uri().optional(),

    duration: Joi.number().integer().min(1).optional(),

    language: Joi.string().optional(),

    release_date: Joi.date().optional()
});

module.exports = {
    createMovieSchema,
    updateMovieSchema
};