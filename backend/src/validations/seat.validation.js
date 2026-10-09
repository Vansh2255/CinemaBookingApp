const Joi = require('joi');

const createSeatSchema = Joi.object({
    screen_id: Joi.number().integer().required(),
    seat_number: Joi.string().trim().required(),
    seat_type: Joi.string().trim().required(),
    is_active: Joi.boolean().default(true)
});

const updateSeatSchema = Joi.object({
    screen_id: Joi.number().integer(),
    seat_number: Joi.string().trim(),
    seat_type: Joi.string().trim(),
    is_active: Joi.boolean()
});

module.exports = {
    createSeatSchema,
    updateSeatSchema
};