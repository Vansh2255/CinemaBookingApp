const express = require("express");
const router = express.Router();

const showtimeController = require("./showtimes.controller");

const authMiddleware = require("../../middleware/auth.middleware");
const authorizeRoles = require("../../middleware/role.middleware");
const validate = require("../../middleware/validation.middleware");

const {
    createShowtimeSchema,
    updateShowtimeSchema
} = require("../../validations/showtime.validation");

/**
 * @swagger
 * tags:
 *   name: Showtimes
 *   description: Showtime Management APIs
 */

/**
 * @swagger
 * /api/showtimes:
 *   get:
 *     summary: Get all showtimes
 *     tags: [Showtimes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of showtimes
 */
router.get(
    "/",
    showtimeController.getAllShowtimes
);

/**
 * @swagger
 * /api/showtimes/{id}:
 *   get:
 *     summary: Get showtime by ID
 *     tags: [Showtimes]
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
 *         description: Showtime details
 *       404:
 *         description: Showtime not found
 */
router.get(
    "/:id",
    showtimeController.getShowtimeById
);

/**
 * @swagger
 * /api/showtimes/{id}/seats:
 *   get:
 *     summary: Get booked seats
 *     tags: [Showtimes]
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
 *         description: Booked seats
 */
router.get(
    "/:id/seats",
    showtimeController.getBookedSeats
);

/**
 * @swagger
 * /api/showtimes/{id}/availability:
 *   get:
 *     summary: Get seat availability
 *     tags: [Showtimes]
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
 *         description: Seat availability
 */
router.get(
    "/:id/availability",
    showtimeController.getSeatAvailability
);

/**
 * @swagger
 * /api/showtimes:
 *   post:
 *     summary: Create showtime
 *     tags: [Showtimes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movie_id
 *               - screen_id
 *               - start_time
 *               - end_time
 *               - total_seats
 *               - prices
 *             properties:
 *               movie_id:
 *                 type: integer
 *               screen_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               total_seats:
 *                 type: integer
 *               prices:
 *                 type: number
 *     responses:
 *       201:
 *         description: Showtime created successfully
 */
router.post(
    "/",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    validate(createShowtimeSchema),
    showtimeController.createShowtime
);

/**
 * @swagger
 * /api/showtimes/{id}:
 *   put:
 *     summary: Update showtime
 *     tags: [Showtimes]
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
 *               movie_id:
 *                 type: integer
 *               screen_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               total_seats:
 *                 type: integer
 *               prices:
 *                 type: number
 *     responses:
 *       200:
 *         description: Showtime updated successfully
 *       404:
 *         description: Showtime not found
 */
router.put(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    validate(updateShowtimeSchema),
    showtimeController.updateShowtime
);

/**
 * @swagger
 * /api/showtimes/{id}:
 *   delete:
 *     summary: Delete showtime
 *     tags: [Showtimes]
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
 *         description: Showtime deleted successfully
 *       404:
 *         description: Showtime not found
 */
router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    showtimeController.deleteShowtime
);

module.exports = router;