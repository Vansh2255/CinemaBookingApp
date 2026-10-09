const movieService = require("./movies.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const getAllMovies = asyncHandler(async (req, res) => {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search || "").trim();
    const sort = req.query.sort || "id";
    const language = (req.query.language || "").trim();
    const genre = (req.query.genre || "").trim();

    if (page < 1) {
        throw new ApiError(400, "Page must be greater than 0");
    }

    if (limit < 1 || limit > 100) {
        throw new ApiError(400, "Limit must be between 1 and 100");
    }

    const result = await movieService.getAllMovies(
        page,
        limit,
        search,
        sort,
        language,
        genre
    );

    const totalPages = Math.ceil(
        result.totalRecords / limit
    );

    res.status(200).json({
        success: true,
        page,
        limit,
        count: result.movies.length,
        totalRecords: result.totalRecords,
        totalPages,
        movies: result.movies
    });

});

const getMovieById = asyncHandler(async (req, res) => {

    const movie = await movieService.getMovieById(req.params.id);

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    res.status(200).json({
        success: true,
        movie
    });

});

const createMovie = asyncHandler(async (req, res) => {

   const {
    title,
    description,
    poster_url,
    duration,
    language,
    release_date
} = req.body;

    const movie = await movieService.createMovie(
    title,
    description,
    poster_url,
    duration,
    language,
    release_date
);

    res.status(201).json({
        success: true,
        movie
    });

});

const updateMovie = asyncHandler(async (req, res) => {

    const {
    title,
    description,
    poster_url,
    duration,
    language,
    release_date
} = req.body;

    const movie = await movieService.updateMovie(
    req.params.id,
    title,
    description,
    poster_url,
    duration,
    language,
    release_date
);

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    res.status(200).json({
        success: true,
        movie
    });

});

const deleteMovie = asyncHandler(async (req, res) => {

    const movie = await movieService.deleteMovie(req.params.id);

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    res.status(200).json({
        success: true,
        message: "Movie deleted successfully",
        movie
    });

});

module.exports = {
    getAllMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
};