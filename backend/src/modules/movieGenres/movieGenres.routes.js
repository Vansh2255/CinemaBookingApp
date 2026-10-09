const express = require("express");
const router = express.Router();

const movieGenreController = require("./movieGenres.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const authorize = require("../../middleware/role.middleware");

/**
 * @swagger
 * tags:
 *   name: Movie Genres
 *   description: Movie Genre Mapping APIs
 */

/**
 * @swagger
 * /api/movie-genres:
 *   post:
 *     summary: Assign Genre to Movie
 *     tags: [Movie Genres]
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
 *               - genre_id
 *             properties:
 *               movie_id:
 *                 type: integer
 *                 example: 1
 *               genre_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Genre assigned successfully
 *       400:
 *         description: Validation error
 */
router.post(
    "/",
    authMiddleware,
    authorize("admin", "super_admin"),
    movieGenreController.assignGenre
);

/**
 * @swagger
 * /api/movie-genres:
 *   get:
 *     summary: Get All Movie Genre Mappings
 *     tags: [Movie Genres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all movie-genre mappings
 */
router.get(
    "/",
    authMiddleware,
    movieGenreController.getAllMappings
);

/**
 * @swagger
 * /api/movie-genres/movie/{movieId}:
 *   get:
 *     summary: Get Genres By Movie
 *     tags: [Movie Genres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Genres fetched successfully
 *       404:
 *         description: Movie not found
 */
router.get(
    "/movie/:movieId",
    authMiddleware,
    movieGenreController.getGenresByMovie
);

/**
 * @swagger
 * /api/movie-genres/{movieId}/{genreId}:
 *   delete:
 *     summary: Remove Genre From Movie
 *     tags: [Movie Genres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: genreId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Genre removed successfully
 *       404:
 *         description: Mapping not found
 */
router.delete(
    "/:movieId/:genreId",
    authMiddleware,
    authorize("admin", "super_admin"),
    movieGenreController.removeGenre
);

module.exports = router;