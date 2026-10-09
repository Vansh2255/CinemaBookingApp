const Joi = require('joi');

const updateProfileSchema = Joi.object({
    name: Joi.string().trim().min(1),
    email: Joi.string().email().trim()
}).min(1);

module.exports = {
    updateProfileSchema
};
