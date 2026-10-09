const express = require("express");

const router = express.Router();

const genreController = require("./genres.controller");

const authMiddleware = require("../../middleware/auth.middleware");

const authorizeRoles = require("../../middleware/role.middleware");

const validate = require('../../middleware/validation.middleware');
const {
    createGenreSchema,
    updateGenreSchema
} = require('../../validations/genre.validation');

/**
 * @swagger
 * tags:
 *   name: Genres
 *   description: Genre Management APIs
 */

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Get all genres
 *     tags: [Genres]
 *     responses:
 *       200:
 *         description: List of genres
 */

/**
 * @swagger
 * /api/genres:
 *   post:
 *     summary: Create genre
 *     tags: [Genres]
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
 *               description:
 *                 type: string
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Genre created
 */

/**
 * @swagger
 * /api/genres/{id}:
 *   get:
 *     summary: Get genre by ID
 *     tags: [Genres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Genre found
 *       404:
 *         description: Genre not found
 */

/**
 * @swagger
 * /api/genres/{id}:
 *   put:
 *     summary: Update genre
 *     tags: [Genres]
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Genre updated
 *       404:
 *         description: Genre not found
 */

/**
 * @swagger
 * /api/genres/{id}:
 *   delete:
 *     summary: Delete genre
 *     tags: [Genres]
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
 *         description: Genre deleted
 *       404:
 *         description: Genre not found
 */

router.get("/", genreController.getAllGenres);

router.get("/:id", genreController.getGenreById);

router.post(
    '/',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(createGenreSchema),
    genreController.createGenre
);

router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('admin', 'super_admin'),
    validate(updateGenreSchema),
    genreController.updateGenre
);

router.delete(
    "/:id",
    authMiddleware,
    authorizeRoles("admin", "super_admin"),
    genreController.deleteGenre
);

module.exports = router;
