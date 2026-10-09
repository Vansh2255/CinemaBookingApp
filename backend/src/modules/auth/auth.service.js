const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmail } = require("../../config/mailer");

const ApiError = require("../../errors/ApiError");

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require("../../utils/jwt");
const prisma = require('../../config/prisma');

const hashRefreshToken = (token) => crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const createSecureToken = () => crypto.randomBytes(32).toString("hex");
const resetUrl = (token) => `${process.env.APP_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
const verificationUrl = (token) => `${process.env.APP_BASE_URL || "http://localhost:3000"}/verify-email?token=${token}`;

const registerUser = async (name, email, password) => {

    // Duplicate email check — Prisma findUnique (email @unique hai)
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user — password hash store hota hai, plaintext kabhi nahi
    // select se sirf safe fields return karte hain (password exclude)
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: 'user'
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isEmailVerified: true,
            createdAt: true
        }
    });

    return user;

};

const loginUser = async (email, password) => {

    const user = await prisma.user.findUnique({
        where: { email }
    });

    // Security: "Invalid credentials" dono cases mein —
    // attacker ko pata nahi chalna chahiye ki email exist karta hai ya password galat hai
    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh token DB mein store karte hain — 7 din expiry
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: hashRefreshToken(refreshToken),
            expiresAt: refreshTokenExpiry
        }
    });

    // Response se password hata dete hain (destructuring se)
    const { password: _password, ...userData } = user;

    return {
        user: userData,
        accessToken,
        refreshToken
    };

};

const refreshAccessToken = async (refreshToken) => {

    // 1. Verify JWT signature without exposing library errors as a 500 response.
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (_error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    // 2. Check token exists in DB (findFirst — token @unique nahi hai)
    const tokenRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) }
    });

    if (!tokenRecord) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // 3. Check expiry
    if (new Date(tokenRecord.expiresAt) < new Date()) {
        await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
        throw new ApiError(401, "Refresh token expired");
    }

    if (tokenRecord.userId !== decoded.id) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // 4. Get user
    const user = await prisma.user.findUnique({
        where: { id: decoded.id }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: tokenRecord.id } }),
        prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashRefreshToken(newRefreshToken),
                expiresAt: refreshTokenExpiry
            }
        })
    ]);

    return {
        accessToken,
        refreshToken: newRefreshToken
    };

};

const logoutUser = async (userId) => {

    // User ke saare refresh tokens delete — logout ke baad invalid
    await prisma.refreshToken.deleteMany({
        where: { userId }
    });

    return true;

};

const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new ApiError(404, "User not found");

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }
    if (currentPassword === newPassword) {
        throw new ApiError(400, "New password must be different from the current password");
    }

    const password = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { password } }),
        prisma.refreshToken.deleteMany({ where: { userId } })
    ]);
};

const requestPasswordReset = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    // The controller always returns a generic response so this endpoint cannot
    // be used to discover which emails have accounts.
    if (!user) return;

    const token = createSecureToken();
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: expiresAt
        }
    });

    try {
        await sendEmail({
            to: user.email,
            subject: "Reset your Movie Reservation password",
            text: `Use this link within 30 minutes to reset your password: ${resetUrl(token)}`,
            html: `<p>Use this link within 30 minutes to reset your password:</p><p><a href="${resetUrl(token)}">Reset password</a></p>`
        });
    } catch (error) {
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordResetTokenHash: null, passwordResetExpiresAt: null }
        });
        throw error;
    }
};

const resetPassword = async (token, newPassword) => {
    const user = await prisma.user.findFirst({
        where: {
            passwordResetTokenHash: hashRefreshToken(token),
            passwordResetExpiresAt: { gt: new Date() }
        }
    });

    if (!user) throw new ApiError(400, "Invalid or expired password reset token");

    const password = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                password,
                passwordResetTokenHash: null,
                passwordResetExpiresAt: null
            }
        }),
        prisma.refreshToken.deleteMany({ where: { userId: user.id } })
    ]);
};

const sendVerificationEmail = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found");
    if (user.isEmailVerified) throw new ApiError(409, "Email is already verified");

    const token = createSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationTokenHash: hashRefreshToken(token),
            emailVerificationExpiresAt: expiresAt
        }
    });

    try {
        await sendEmail({
            to: user.email,
            subject: "Verify your Movie Reservation email",
            text: `Use this link within 24 hours to verify your email: ${verificationUrl(token)}`,
            html: `<p>Use this link within 24 hours to verify your email:</p><p><a href="${verificationUrl(token)}">Verify email</a></p>`
        });
    } catch (error) {
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerificationTokenHash: null, emailVerificationExpiresAt: null }
        });
        throw error;
    }
};

const verifyEmail = async (token) => {
    const user = await prisma.user.findFirst({
        where: {
            emailVerificationTokenHash: hashRefreshToken(token),
            emailVerificationExpiresAt: { gt: new Date() }
        }
    });

    if (!user) throw new ApiError(400, "Invalid or expired email verification token");

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null
        }
    });
};

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changePassword,
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
    verifyEmail
};
