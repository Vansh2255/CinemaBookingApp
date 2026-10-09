const express = require("express");

const router = express.Router();

const movieController = require("./movies.controller");

const authMiddleware = require("../../middleware/auth.middleware");
const authorize = require("../../middleware/role.middleware");

const validate = require("../../middleware/validation.middleware");
const {
    createMovieSchema,
    updateMovieSchema
} = require("../../validations/movie.validation");

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Movie Management APIs
 */

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: Avengers
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort by id,title,duration,release_date,created_at. Prefix '-' for descending.
 *         example: -created_at
 *       - in: query
 *         name: language
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter movies by language
 *         example: Hindi
 *       - in: query
 *         name: genre
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter movies by genre
 *         example: Action
 *     responses:
 *       200:
 *         description: List of movies
 */


router.get(
    "/",
    authMiddleware,
    movieController.getAllMovies
);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
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
 *         description: Movie found
 *       404:
 *         description: Movie not found
 */
router.get(
    "/:id",
    authMiddleware,
    movieController.getMovieById
);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Create a movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - duration
 *               - language
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               poster_url:
 *                 type: string
 *               duration:
 *                 type: integer
 *               language:
 *                 type: string
 *               release_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Movie created
 */
router.post(
    "/",
    authMiddleware,
    authorize("admin", "super_admin"),
    validate(createMovieSchema),
    movieController.createMovie
);

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Update movie
 *     tags: [Movies]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               poster_url:
 *                 type: string
 *               duration:
 *                 type: integer
 *               language:
 *                 type: string
 *               release_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Movie updated
 */
router.put(
    "/:id",
    authMiddleware,
    authorize("admin", "super_admin"),
    validate(updateMovieSchema),
    movieController.updateMovie
);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Delete movie
 *     tags: [Movies]
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
 *         description: Movie deleted
 */
router.delete(
    "/:id",
    authMiddleware,
    authorize("admin", "super_admin"),
    movieController.deleteMovie
);

module.exports = router;