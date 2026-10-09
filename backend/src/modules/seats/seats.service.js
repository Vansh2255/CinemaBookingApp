const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");

const createSeat = async (seatData) => {
    const { screen_id, seat_number, seat_type } = seatData;

    const screen = await prisma.screen.findUnique({
        where: { id: screen_id }
    });

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }

    const duplicate = await prisma.seat.findFirst({
        where: {
            screenId: screen_id,
            seatNumber: { equals: seat_number, mode: 'insensitive' }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Seat already exists");
    }

    const seat = await prisma.seat.create({
        data: {
            screenId: screen_id,
            seatNumber: seat_number,
            seatType: seat_type
        }
    });

    return seat;
};

const getAllSeats = async () => {
    const seats = await prisma.seat.findMany({
        orderBy: { id: 'asc' }
    });

    return seats;
};

const getSeatById = async (id) => {
    id = Number(id);

    const seat = await prisma.seat.findUnique({
        where: { id }
    });

    return seat;
};

const getSeatsByScreen = async (screenId) => {
    screenId = Number(screenId);

    const screen = await prisma.screen.findUnique({
        where: { id: screenId }
    });

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }

    const seats = await prisma.seat.findMany({
        where: { screenId },
        orderBy: { seatNumber: 'asc' }
    });

    return seats;
};

const updateSeat = async (id, seatData) => {
    id = Number(id);

    const { screen_id, seat_number, seat_type, is_active } = seatData;

    const existing = await prisma.seat.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Seat not found");
    }

    const screen = await prisma.screen.findUnique({
        where: { id: screen_id }
    });

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }

    const duplicate = await prisma.seat.findFirst({
        where: {
            screenId: screen_id,
            seatNumber: { equals: seat_number, mode: 'insensitive' },
            id: { not: id }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Seat already exists");
    }

    const seat = await prisma.seat.update({
        where: { id },
        data: {
            screenId: screen_id,
            seatNumber: seat_number,
            seatType: seat_type,
            isActive: is_active
        }
    });

    return seat;
};

const deleteSeat = async (id) => {
    id = Number(id);

    const existing = await prisma.seat.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Seat not found");
    }

    const reservation = await prisma.reservation.findFirst({
        where: { seatId: id }
    });

    if (reservation) {
        throw new ApiError(409, "Cannot delete seat because reservations exist");
    }

    const seat = await prisma.seat.delete({
        where: { id }
    });

    return seat;
};

module.exports = {
    createSeat,
    getAllSeats,
    getSeatById,
    getSeatsByScreen,
    updateSeat,
    deleteSeat
};
