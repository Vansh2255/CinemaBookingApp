const genreService = require("./genres.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const createGenre = asyncHandler(async (req, res) => {

    const genre = await genreService.createGenre(req.body);

    return res.status(201).json({
        success: true,
        genre
    });

});

const getAllGenres = asyncHandler(async (req, res) => {

    const genres = await genreService.getAllGenres();

    return res.status(200).json({
        success: true,
        genres
    });

});

const getGenreById = asyncHandler(async (req, res) => {

    const genre = await genreService.getGenreById(req.params.id);

    if (!genre) {
        throw new ApiError(404, "Genre not found");
    }

    return res.status(200).json({
        success: true,
        genre
    });

});

const updateGenre = asyncHandler(async (req, res) => {

    const genre = await genreService.updateGenre(
        req.params.id,
        req.body
    );

    if (!genre) {
        throw new ApiError(404, "Genre not found");
    }

    return res.status(200).json({
        success: true,
        genre
    });

});

const deleteGenre = asyncHandler(async (req, res) => {

    const genre = await genreService.deleteGenre(req.params.id);

    if (!genre) {
        throw new ApiError(404, "Genre not found");
    }

    return res.status(200).json({
        success: true,
        message: "Genre deleted successfully",
        genre
    });

});

module.exports = {
  createGenre,
  getAllGenres,
  getGenreById,
  updateGenre,
  deleteGenre,
};