const Joi = require("joi");

const assignGenreSchema = Joi.object({
    movie_id: Joi.number().integer().required(),
    genre_id: Joi.number().integer().required()
});

module.exports = {
    assignGenreSchema
};