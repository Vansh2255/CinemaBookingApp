const reservationService = require('./reservation.service');
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const getAllReservations = asyncHandler(async (req, res) => {

    const reservations =
        await reservationService.getAllReservations();

    return res.status(200).json({
        success: true,
        reservations
    });

});

const getReservationById = asyncHandler(async (req, res) => {

    const reservation =
        await reservationService.getReservationById(req.params.id, req.user);

   if (!reservation) {
    throw new ApiError(404, "Reservation not found");
}

    return res.status(200).json({
        success: true,
        reservation
    });

});

const createReservation = asyncHandler(async (req, res) => {

    const user_id = req.user.id;

    const {
        showtime_id,
        seat_id,
        coupon_code
    } = req.body;

    const reservation =
        await reservationService.createReservation(
            user_id,
            showtime_id,
            seat_id,
            coupon_code
        );

    return res.status(201).json({
        success: true,
        reservation
    });

});

const updateReservation = asyncHandler(async (req, res) => {

    const {
        showtime_id,
        seat_id
    } = req.body;

    const reservation =
        await reservationService.updateReservation(
            req.params.id,
            req.user,
            showtime_id,
            seat_id
        );

    return res.status(200).json({
        success: true,
        reservation
    });

});

const cancelReservation = asyncHandler(async (req, res) => {
    const reservation = await reservationService.cancelReservation(req.params.id, req.user);

    return res.status(200).json({
        success: true,
        message: "Reservation cancelled",
        reservation
    });
});

const deleteReservation = asyncHandler(async (req, res) => {

    const reservation =
        await reservationService.deleteReservation(req.params.id);

    if (!reservation) {
        throw new ApiError(404,"Reservation not found");
    }

    return res.status(200).json({
        success: true,
        message: "Reservation deleted",
        reservation
    });

});

const getMyBookings = asyncHandler(async (req, res) => {

    const bookings =
        await reservationService.getMyBookings(req.user.id);

    return res.status(200).json({
        success: true,
        bookings
    });

});

module.exports = {
    getAllReservations,
    getReservationById,
    createReservation,
    updateReservation,
    cancelReservation,
    deleteReservation,
    getMyBookings
};
