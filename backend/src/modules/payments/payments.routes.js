const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validation.middleware");
const { createPaymentIntentSchema } = require("../../validations/payment.validation");

const paymentsController = require("./payments.controller");

// NOTE: /webhook route app.js mein alag se define hai
// (raw body chahiye signature verify ke liye, isliye express.json se pehle mount hota hai).
// Webhook Stripe → server call hai, client directly use nahi karta.

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Stripe payments — create intent, webhook, history
 */

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create a Stripe payment intent for a pending reservation
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reservation_id]
 *             properties:
 *               reservation_id:
 *                 type: integer
 *                 description: ID of the pending reservation to pay for
 *                 example: 1
 *     responses:
 *       201:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     reservationId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                       description: Amount in rupees
 *                     currency:
 *                       type: string
 *                     status:
 *                       type: string
 *                     clientSecret:
 *                       type: string
 *                       description: Frontend ko payment confirm karne ke liye
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot pay for another user's reservation
 *       404:
 *         description: Reservation not found
 *       409:
 *         description: Reservation not pending, or hold expired
 */

router.post(
    "/create-intent",
    authMiddleware,
    validate(createPaymentIntentSchema),
    paymentsController.createIntent
);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Refund a succeeded payment (releases the seat)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment refunded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot refund another user's payment
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment not succeeded, or reservation not confirmed
 */

router.post(
    "/:id/refund",
    authMiddleware,
    paymentsController.refundPayment
);

/**
 * @swagger
 * /api/payments/my-payments:
 *   get:
 *     summary: Get current user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */

router.get(
    "/my-payments",
    authMiddleware,
    paymentsController.getMyPayments
);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get a single payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot view another user's payment
 *       404:
 *         description: Payment not found
 */

router.get(
    "/:id",
    authMiddleware,
    paymentsController.getPaymentById
);

module.exports = router;
