const seatService = require("./seats.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const createSeat = asyncHandler(async (req, res) => {

  const seat = await seatService.createSeat(req.body);

  return res.status(201).json({
    success: true,
    seat
  });

});

const getAllSeats = asyncHandler(async (req, res) => {

  const seats = await seatService.getAllSeats();

  return res.json({
    success: true,
    seats
  });

});

const getSeatById = asyncHandler(async (req, res) => {

    const seat = await seatService.getSeatById(req.params.id);

    if (!seat) {
        throw new ApiError(404, "Seat not found");
    }

    return res.json({
        success: true,
        seat
    });

});

const getSeatsByScreen = asyncHandler(async (req, res) => {

  const seats = await seatService.getSeatsByScreen(
    req.params.screenId
  );

  return res.json({
    success: true,
    seats
  });

});

const updateSeat = asyncHandler(async (req, res) => {

    const seat = await seatService.updateSeat(
        req.params.id,
        req.body
    );

    if (!seat) {
        throw new ApiError(404, "Seat not found");
    }

    return res.json({
        success: true,
        seat
    });

});

const deleteSeat = asyncHandler(async (req, res) => {

    const seat = await seatService.deleteSeat(req.params.id);

    if (!seat) {
        throw new ApiError(404, "Seat not found");
    }

    return res.json({
        success: true,
        message: "Seat deleted",
        seat
    });

});

module.exports = {
  createSeat,
  getAllSeats,
  getSeatById,
  getSeatsByScreen,
  updateSeat,
  deleteSeat,
};