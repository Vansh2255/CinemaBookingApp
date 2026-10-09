const Joi = require("joi");

const createShowtimeSchema = Joi.object({
    movie_id: Joi.number().integer().required(),

    screen_id: Joi.number().integer().required(),

    start_time: Joi.date().required(),

    end_time: Joi.date().greater(Joi.ref("start_time")).required(),

    total_seats: Joi.number().integer().min(1).required(),

    prices: Joi.number().positive().required()
});

const updateShowtimeSchema = Joi.object({
    movie_id: Joi.number().integer().optional(),

    screen_id: Joi.number().integer().optional(),

    start_time: Joi.date().optional(),

    end_time: Joi.date().optional(),

    total_seats: Joi.number().integer().min(1).optional(),

    prices: Joi.number().positive().optional()
});

module.exports = {
    createShowtimeSchema,
    updateShowtimeSchema
};