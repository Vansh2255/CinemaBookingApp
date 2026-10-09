const Joi = require('joi');

const createReservationSchema = Joi.object({
    showtime_id: Joi.number().integer().required(),
    seat_id: Joi.number().integer().required(),
    coupon_code: Joi.string().trim().uppercase().max(50).optional()
});

const updateReservationSchema = Joi.object({
    showtime_id: Joi.number().integer(),
    seat_id: Joi.number().integer()
}).min(1);

module.exports = {
    createReservationSchema,
    updateReservationSchema
};
