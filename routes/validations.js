const Joi = require("joi");

const registerSchema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required()
});

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
});


const uploadSchema = Joi.object({
    tags: Joi.string().required(),
});
const reorderSchema = Joi.object({
    reorderedFiles: Joi.array()
        .items(
            Joi.object({
                _id: Joi.string().required(),
            }).unknown(true)
        )
        .min(1)
        .required(),
});

module.exports = {
    loginSchema,
    registerSchema,
    uploadSchema,
    reorderSchema
}