const express = require('express');
const router = express.Router();

const theatreController =
    require('./theatres.controller');

const authMiddleware =
    require('../../middleware/auth.middleware');

const authorizeRoles =
    require('../../middleware/role.middleware');

const validate =
    require('../../middleware/validation.middleware');


const {
    createTheaterSchema,
    updateTheaterSchema
} = require('../../validations/theater.validation');

/**
 * @swagger
 * tags:
 *   name: Theatres
 *   description: Theatre Management APIs
 */

/**
 * @swagger
 * /api/theatres:
 *   get:
 *     summary: Get all theatres
 *     tags: [Theatres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by theatre name or location
 *
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: -created_at
 *         description: Sort by id,name,location,total_seats,created_at. Prefix "-" for descending.
 *
 *     responses:
 *       200:
 *         description: List of theatres
 */

/**
 * @swagger
 * /api/theatres:
 *   post:
 *     summary: Create theatre
 *     tags: [Theatres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *            
 *             required:
 *               - name
 *               - location
 *               
 *     responses:
 *       201:
 *         description: Theatre created
 */

/**
 * @swagger
 * /api/theatres/{id}:
 *   get:
 *     summary: Get theatre by ID
 *     tags: [Theatres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Theatre found
 *       404:
 *         description: Theatre not found
 */

/**
 * @swagger
 * /api/theatres/{id}:
 *   put:
 *     summary: Update theatre
 *     tags: [Theatres]
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
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Theatre updated
 */

/**
 * @swagger
 * /api/theatres/{id}:
 *   delete:
 *     summary: Delete theatre
 *     tags: [Theatres]
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
 *         description: Theatre deleted
 */

router.get(
    '/',
    theatreController.getAllTheatres
);

router.get(
    '/:id',
    theatreController.getTheatreById
);

router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(createTheaterSchema),
    theatreController.createTheatre
);

router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(updateTheaterSchema),
    theatreController.updateTheatre
);

router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    theatreController.deleteTheatre
);

module.exports = router;