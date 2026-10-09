const express = require('express');

const router = express.Router();

const screensController = require('./screens.controller');

const authMiddleware = require('../../middleware/auth.middleware');
const authorizeRoles = require('../../middleware/role.middleware');
const validate = require('../../middleware/validation.middleware');

const {
    createScreenSchema,
    updateScreenSchema
} = require('../../validations/screen.validation');

/**
 * @swagger
 * tags:
 *   name: Screens
 *   description: Screen Management APIs
 */

/**
 * @swagger
 * /api/screens:
 *   get:
 *     summary: Get all screens
 *     tags: [Screens]
 *     responses:
 *       200:
 *         description: List of screens
 */

/**
 * @swagger
 * /api/screens:
 *   post:
 *     summary: Create screen
 *     tags: [Screens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - theatre_id
 *               - name
 *             properties:
 *               theatre_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               screen_type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Screen created
 */

/**
 * @swagger
 * /api/screens/{id}:
 *   get:
 *     summary: Get screen by ID
 *     tags: [Screens]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Screen found
 *       404:
 *         description: Screen not found
 */

/**
 * @swagger
 * /api/screens/{id}:
 *   put:
 *     summary: Update screen
 *     tags: [Screens]
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
 *               theatre_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               screen_type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Screen updated
 *       404:
 *         description: Screen not found
 */

/**
 * @swagger
 * /api/screens/{id}:
 *   delete:
 *     summary: Delete screen
 *     tags: [Screens]
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
 *         description: Screen deleted
 *       404:
 *         description: Screen not found
 */

router.get(
    '/',
    screensController.getAllScreens
);

router.get(
    '/:id',
    screensController.getScreenById
);

router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(createScreenSchema),
    screensController.createScreen
);

router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(updateScreenSchema),
    screensController.updateScreen
);

router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    screensController.deleteScreen
);

module.exports = router;
