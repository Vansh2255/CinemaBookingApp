const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: "Validation Failed",
                errors: error.details.map(err => err.message)
            });
        }

        // Joi ka converted value wapas req.body mein assign karte hain
        // — numeric fields ab numbers ban jate hain (Prisma Int expect karta hai)
        // — stripUnknown se unknown fields bhi remove ho jate hain
        req.body = value;

        next();
    };
};

module.exports = validate;