const showtimeService = require("./showtimes.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const getAllShowtimes = asyncHandler(async (req, res) => {

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

    const result = await showtimeService.getAllShowtimes(
        page,
        limit,
        search,
        sort
    );

    res.status(200).json({
        success: true,
        total: result.total,
        count: result.showtimes.length,
        page,
        limit,
        showtimes: result.showtimes
    });

});

const getShowtimeById = asyncHandler(async (req, res) => {

    const showtime = await showtimeService.getShowtimeById(req.params.id);

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    res.status(200).json({
        success: true,
        showtime
    });

});

const createShowtime = asyncHandler(async (req, res) => {

    const {
        movie_id,
        screen_id,
        start_time,
        end_time,
        total_seats,
        prices
    } = req.body;

    const showtime = await showtimeService.createShowtime(
        movie_id,
        screen_id,
        start_time,
        end_time,
        total_seats,
        prices
    );

    res.status(201).json({
        success: true,
        showtime
    });

});

const updateShowtime = asyncHandler(async (req, res) => {

    const {
        movie_id,
        screen_id,
        start_time,
        end_time,
        total_seats,
        prices
    } = req.body;

    const showtime = await showtimeService.updateShowtime(
        req.params.id,
        movie_id,
        screen_id,
        start_time,
        end_time,
        total_seats,
        prices
    );

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    res.status(200).json({
        success: true,
        showtime
    });

});

const deleteShowtime = asyncHandler(async (req, res) => {

    const showtime = await showtimeService.deleteShowtime(
        req.params.id
    );

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    res.status(200).json({
        success: true,
        message: "Showtime deleted successfully",
        showtime
    });

});

const getBookedSeats = asyncHandler(async (req, res) => {

    const seats = await showtimeService.getBookedSeats(
        req.params.id
    );

    res.status(200).json({
        success: true,
        bookedSeats: seats
    });

});

const getSeatAvailability = asyncHandler(async (req, res) => {

    const availability = await showtimeService.getSeatAvailability(
        req.params.id
    );

    res.status(200).json({
        success: true,
        availability
    });

});

module.exports = {
    getAllShowtimes,
    getShowtimeById,
    createShowtime,
    updateShowtime,
    deleteShowtime,
    getBookedSeats,
    getSeatAvailability
};