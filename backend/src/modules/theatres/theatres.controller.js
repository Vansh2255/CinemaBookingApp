const theatreService = require("./theatres.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const getAllTheatres = asyncHandler(async (req, res) => {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search || "").trim();
    const sort = req.query.sort || "id";

    if (page < 1) {
        throw new ApiError(400, "Page must be greater than 0");
    }

    if (limit < 1 || limit > 100) {
        throw new ApiError(400, "Limit must be between 1 and 100");
    }

    const result = await theatreService.getAllTheatres(
        page,
        limit,
        search,
        sort
    );

    res.status(200).json({
        success: true,
        total: result.total,
        count: result.theatres.length,
        page,
        limit,
        theatres: result.theatres
    });

});

const getTheatreById = asyncHandler(async (req, res) => {

    const theatre = await theatreService.getTheatreById(
        req.params.id
    );

    if (!theatre) {
        throw new ApiError(404, "Theatre not found");
    }

    res.status(200).json({
        success: true,
        theatre
    });

});

const createTheatre = asyncHandler(async (req, res) => {

    const {
        name,
        location
    } = req.body;

    const theatre = await theatreService.createTheatre(
        name,
        location
    );

    res.status(201).json({
        success: true,
        theatre
    });

});

const updateTheatre = asyncHandler(async (req, res) => {

    const {
        name,
        location
    } = req.body;

    const theatre = await theatreService.updateTheatre(
        req.params.id,
        name,
        location
    );

    if (!theatre) {
        throw new ApiError(404, "Theatre not found");
    }

    res.status(200).json({
        success: true,
        theatre
    });

});

const deleteTheatre = asyncHandler(async (req, res) => {

    const theatre = await theatreService.deleteTheatre(
        req.params.id
    );

    if (!theatre) {
        throw new ApiError(404, "Theatre not found");
    }

    res.status(200).json({
        success: true,
        message: "Theatre deleted successfully",
        theatre
    });

});

module.exports = {
    getAllTheatres,
    getTheatreById,
    createTheatre,
    updateTheatre,
    deleteTheatre
};