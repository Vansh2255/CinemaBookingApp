const express = require("express");

const router = express.Router();

const seatController = require("./seats.controller");

const authMiddleware = require('../../middleware/auth.middleware');
const authorizeRoles = require('../../middleware/role.middleware');
const validate = require('../../middleware/validation.middleware');

const {
    createSeatSchema,
    updateSeatSchema
} = require('../../validations/seat.validation');

/**
 * @swagger
 * tags:
 *   name: Seats
 *   description: Seat Management APIs
 */

/**
 * @swagger
 * /api/seats:
 *   get:
 *     summary: Get all seats
 *     tags: [Seats]
 *     responses:
 *       200:
 *         description: List of all seats
 */
router.get("/", seatController.getAllSeats);

/**
 * @swagger
 * /api/seats:
 *   post:
 *     summary: Create seat
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               screen_id:
 *                 type: integer
 *               seat_number:
 *                 type: string
 *             required:
 *               - screen_id
 *               - seat_number
 *     responses:
 *       201:
 *         description: Seat created successfully
 */

router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(createSeatSchema),
    seatController.createSeat
);

/**
 * @swagger
 * /api/seats/screen/{screenId}:
 *   get:
 *     summary: Get seats by screen
 *     tags: [Seats]
 *     parameters:
 *       - in: path
 *         name: screenId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Seats fetched successfully
 */
router.get("/screen/:screenId", seatController.getSeatsByScreen);

/**
 * @swagger
 * /api/seats/{id}:
 *   get:
 *     summary: Get seat by ID
 *     tags: [Seats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Seat found
 *       404:
 *         description: Seat not found
 */
router.get("/:id", seatController.getSeatById);

/**
 * @swagger
 * /api/seats/{id}:
 *   put:
 *     summary: Update seat
 *     tags: [Seats]
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
 *               screen_id:
 *                 type: integer
 *               seat_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Seat updated
 *       404:
 *         description: Seat not found
 */

router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(updateSeatSchema),
    seatController.updateSeat
);

/**
 * @swagger
 * /api/seats/{id}:
 *   delete:
 *     summary: Delete seat
 *     tags: [Seats]
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
 *         description: Seat deleted
 *       404:
 *         description: Seat not found
 */
router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    seatController.deleteSeat
);

module.exports = router;