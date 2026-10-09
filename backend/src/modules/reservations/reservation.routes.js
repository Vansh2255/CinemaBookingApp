const express = require("express");
const router = express.Router();

const reservationController = require("./reservation.controller");

const authMiddleware = require("../../middleware/auth.middleware");
const authorizeRoles = require("../../middleware/role.middleware");
const validate = require("../../middleware/validation.middleware");

const {
    createReservationSchema,
    updateReservationSchema
} = require("../../validations/reservation.validation");

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation Management APIs
 */

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations
 *     tags: [Reservations]
 *     responses:
 *       200:
 *         description: List of reservations
 */
router.get(
    "/",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    reservationController.getAllReservations
);

/**
 * @swagger
 * /api/reservations/my-bookings:
 *   get:
 *     summary: Get logged in user's bookings
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User bookings fetched successfully
 *       401:
 *         description: Unauthorized
 */

router.get(
    "/my-bookings",
    authMiddleware,
    reservationController.getMyBookings
);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reservation found
 *       404:
 *         description: Reservation not found
 */
router.get(
    "/:id",
    authMiddleware,
    reservationController.getReservationById
);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               showtime_id:
 *                 type: integer
 *                 example: 14
 *               seat_id:
 *                 type: integer
 *                 example: 11
 *               status:
 *                 type: string
 *                 example: CONFIRMED
 *     responses:
 *       201:
 *         description: Reservation created successfully
 */
router.post(
    "/",
    authMiddleware,
    authorizeRoles("user", "admin", "super_admin"),
    validate(createReservationSchema),
    reservationController.createReservation
);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               showtime_id:
 *                 type: integer
 *               seat_id:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 */
router.put(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    validate(updateReservationSchema),
    reservationController.updateReservation
);

router.patch(
    "/:id/cancel",
    authMiddleware,
    reservationController.cancelReservation
);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       404:
 *         description: Reservation not found
 */
router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    reservationController.deleteReservation
);

module.exports = router;
