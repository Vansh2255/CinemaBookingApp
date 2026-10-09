const movieGenreService = require("./movieGenres.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");
const { assignGenreSchema } = require("../../validations/movieGenre.validation");


const assignGenre = asyncHandler(async (req, res) => {

    const { error } = assignGenreSchema.validate(req.body);

    if (error) {
        throw new ApiError(400, error.details[0].message);
    }

    const { movie_id, genre_id } = req.body;

    const mapping =
        await movieGenreService.assignGenre(
            movie_id,
            genre_id
        );

    return res.status(201).json({
        success: true,
        message: "Genre assigned successfully",
        data: mapping
    });

});


const getAllMappings = asyncHandler(async (req, res) => {

    const mappings =
        await movieGenreService.getAllMappings();

    return res.json({
        success: true,
        count: mappings.length,
        data: mappings
    });

});


const getGenresByMovie = asyncHandler(async (req, res) => {

    const genres =
        await movieGenreService.getGenresByMovie(
            req.params.movieId
        );

    return res.json({
        success: true,
        count: genres.length,
        data: genres
    });

});


const removeGenre = asyncHandler(async (req, res) => {

    const deleted =
        await movieGenreService.removeGenre(
            req.params.movieId,
            req.params.genreId
        );

    return res.json({
        success: true,
        message: "Genre removed successfully",
        data: deleted
    });

});

module.exports = {
    assignGenre,
    getAllMappings,
    getGenresByMovie,
    removeGenre
};