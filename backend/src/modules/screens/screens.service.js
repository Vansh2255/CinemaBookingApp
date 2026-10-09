const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");

const getAllScreens = async (page, limit, search, sort) => {

    const offset = (page - 1) * limit;

    const allowedSortFields = ["id", "name", "capacity", "createdAt"];

    let orderBy = { id: 'asc' };

    if (sort) {
        const direction = sort.startsWith("-") ? "desc" : "asc";
        const field = sort.replace("-", "");

        if (allowedSortFields.includes(field)) {
            orderBy = { [field]: direction };
        }
    }

    const where = {
        name: { contains: search, mode: 'insensitive' }
    };

    const totalRecords = await prisma.screen.count({ where });

    const screens = await prisma.screen.findMany({
        where,
        include: {
            theatre: {
                select: { id: true, name: true }
            }
        },
        orderBy,
        skip: offset,
        take: limit
    });

    return {
        totalRecords,
        screens
    };

};

const getScreenById = async (id) => {
    id = Number(id);

    const screen = await prisma.screen.findUnique({
        where: { id },
        include: {
            theatre: {
                select: { id: true, name: true }
            }
        }
    });

    return screen;
};

const createScreen = async (theatre_id, name, capacity, screen_type) => {

    const theatre = await prisma.theatre.findUnique({
        where: { id: theatre_id }
    });

    if (!theatre) {
        throw new ApiError(404, "Theatre not found");
    }

    const duplicate = await prisma.screen.findFirst({
        where: {
            theatreId: theatre_id,
            name: { equals: name, mode: 'insensitive' }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Screen already exists");
    }

    const screen = await prisma.screen.create({
        data: {
            theatreId: theatre_id,
            name,
            capacity,
            screenType: screen_type
        }
    });

    return screen;
};

const updateScreen = async (id, theatre_id, name, capacity, screen_type) => {
    id = Number(id);

    const existing = await prisma.screen.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Screen not found");
    }

    theatre_id = theatre_id ?? existing.theatreId;
    name = name ?? existing.name;
    capacity = capacity ?? existing.capacity;
    screen_type = screen_type ?? existing.screenType;

    const theatre = await prisma.theatre.findUnique({
        where: { id: theatre_id }
    });

    if (!theatre) {
        throw new ApiError(404, "Theatre not found");
    }

    const duplicate = await prisma.screen.findFirst({
        where: {
            theatreId: theatre_id,
            name: { equals: name, mode: 'insensitive' },
            id: { not: id }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Screen already exists");
    }

    const seatCount = await prisma.seat.count({ where: { screenId: id } });
    if (capacity < seatCount) {
        throw new ApiError(400, "Screen capacity cannot be less than its existing seats");
    }
    const oversizedShowtime = await prisma.showtime.findFirst({
        where: { screenId: id, totalSeats: { gt: capacity } }
    });
    if (oversizedShowtime) {
        throw new ApiError(400, "Screen capacity cannot be less than an existing showtime's seats");
    }

    const screen = await prisma.screen.update({
        where: { id },
        data: {
            theatreId: theatre_id,
            name,
            capacity,
            screenType: screen_type
        }
    });

    return screen;
};

const deleteScreen = async (id) => {
    id = Number(id);

    const existing = await prisma.screen.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Screen not found");
    }

    const seats = await prisma.seat.findFirst({
        where: { screenId: id }
    });

    if (seats) {
        throw new ApiError(409, "Cannot delete screen because seats exist");
    }

    const screen = await prisma.screen.delete({
        where: { id }
    });

    return screen;
};

module.exports = {
    getAllScreens,
    getScreenById,
    createScreen,
    updateScreen,
    deleteScreen
};
