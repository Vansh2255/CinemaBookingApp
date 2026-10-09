const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

const generateRefreshToken = (user) => {
    // jti (unique ID) add karte hain — warna same second mein 2 login
    // identical refresh token bana dete hain (JWT ka iat seconds mein hota hai),
    // jo tokenHash ke unique constraint se collide karta hai (P2002).
    return jwt.sign(
        {
            id: user.id,
            jti: crypto.randomBytes(16).toString("hex")
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
        }
    );
};

const verifyRefreshToken = (token) => {
    return jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
};
