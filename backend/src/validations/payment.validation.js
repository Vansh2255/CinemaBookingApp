const Joi = require("joi");

const createPaymentIntentSchema = Joi.object({
    reservation_id: Joi.number().integer().required()
});

module.exports = {
    createPaymentIntentSchema
};
