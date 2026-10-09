const Joi = require('joi');

const createTheaterSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    location: Joi.string().trim().required()
});

const updateTheaterSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100),
    location: Joi.string().trim()
});

module.exports = {
    createTheaterSchema,
    updateTheaterSchema
};