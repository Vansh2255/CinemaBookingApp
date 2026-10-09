const express = require('express');
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");

const validate = require("../../middleware/validation.middleware");

const asyncHandler = require("../../utils/asyncHandler");

const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require("../../validations/auth.validation");

const authController = require('./auth.controller');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

router.post(
    "/signup",
    validate(registerSchema),
    asyncHandler(authController.register)
);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 */

router.post(
    "/login",
    validate(loginSchema),
    asyncHandler(authController.login)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@test.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 */

router.post(
    "/refresh-token",
    validate(refreshTokenSchema),
    asyncHandler(authController.refreshToken)
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Generate new access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIs...
 *     responses:
 *       200:
 *         description: Access token generated successfully
 *       401:
 *         description: Invalid refresh token
 */

router.post(
    "/logout",
    authMiddleware,
    asyncHandler(authController.logout)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Unauthorized
 */

router.post(
    "/change-password",
    authMiddleware,
    validate(changePasswordSchema),
    asyncHandler(authController.changePassword)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent (if account exists)
 */

router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    asyncHandler(authController.forgotPassword)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: 64-char hex token from the reset email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */

router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    asyncHandler(authController.resetPassword)
);

/**
 * @swagger
 * /api/auth/send-verification-email:
 *   post:
 *     summary: Send email verification link
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         description: Unauthorized
 */

router.post(
    "/send-verification-email",
    authMiddleware,
    asyncHandler(authController.sendVerificationEmail)
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email using a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: 64-char hex token from the verification email
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 */

router.post(
    "/verify-email",
    validate(verifyEmailSchema),
    asyncHandler(authController.verifyEmail)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout User
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */

module.exports = router;
