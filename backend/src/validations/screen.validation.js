const Joi = require('joi');

const createScreenSchema = Joi.object({
    theatre_id: Joi.number().integer().required(),
    name: Joi.string().trim().required(),
    capacity: Joi.number().integer().min(1).required(),
    screen_type: Joi.string().trim().required()
});

const updateScreenSchema = Joi.object({
    theatre_id: Joi.number().integer(),
    name: Joi.string().trim(),
    capacity: Joi.number().integer().min(1),
    screen_type: Joi.string().trim()
}).min(1);

module.exports = {
    createScreenSchema,
    updateScreenSchema
};