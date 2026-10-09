const nodemailer = require("nodemailer");
const ApiError = require("../errors/ApiError");

const requiredConfig = ["MAIL_HOST", "MAIL_PORT", "MAIL_USER", "MAIL_PASSWORD", "MAIL_FROM"];

const sendEmail = async ({ to, subject, text, html }) => {
    const missing = requiredConfig.filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new ApiError(503, `Email service is not configured (missing: ${missing.join(", ")})`);
    }

    const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        }
    });

    await transport.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html
    });
};

module.exports = { sendEmail };
