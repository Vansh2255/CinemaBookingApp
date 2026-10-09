const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");

const expirePendingReservations = async (showtimeId) => prisma.reservation.updateMany({
    where: { showtimeId, status: "PENDING", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" }
});

// Joined data (movie, screen, theatre) ko flat object mein convert karta hai
const formatShowtime = (showtime) => ({
    id: showtime.id,
    movieId: showtime.movieId,
    screenId: showtime.screenId,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    totalSeats: showtime.totalSeats,
    prices: Number(showtime.prices),
    movieTitle: showtime.movie?.title ?? null,
    screenName: showtime.screen?.name ?? null,
    theatreName: showtime.screen?.theatre?.name ?? null
});

const getAllShowtimes = async (page, limit, search, sort) => {

    const offset = (page - 1) * limit;

    const allowedSortFields = [
        "id",
        "startTime",
        "endTime",
        "prices",
        "totalSeats"
    ];

    let orderBy = { id: "asc" };

    if (sort) {
        const direction = sort.startsWith("-") ? "desc" : "asc";
        const field = sort.replace("-", "");

        if (allowedSortFields.includes(field)) {
            orderBy = { [field]: direction };
        }
    }

    // Search: movie title ya theatre name dono pe (OR condition)
    const where = {
        OR: [
            { movie: { title: { contains: search, mode: "insensitive" } } },
            { screen: { theatre: { name: { contains: search, mode: "insensitive" } } } }
        ]
    };

    const total = await prisma.showtime.count({ where });

    const showtimes = await prisma.showtime.findMany({
        where,
        include: {
            movie: { select: { id: true, title: true } },
            screen: {
                select: {
                    id: true,
                    name: true,
                    theatre: { select: { id: true, name: true } }
                }
            }
        },
        orderBy,
        skip: offset,
        take: limit
    });

    return {
        total,
        showtimes: showtimes.map(formatShowtime)
    };

};

const getShowtimeById = async (id) => {
    id = Number(id);

    const showtime = await prisma.showtime.findUnique({
        where: { id },
        include: {
            movie: { select: { id: true, title: true } },
            screen: {
                select: {
                    id: true,
                    name: true,
                    theatre: { select: { id: true, name: true } }
                }
            }
        }
    });

    if (!showtime) {
        return null;
    }

    return formatShowtime(showtime);
};

const createShowtime = async (movie_id, screen_id, start_time, end_time, total_seats, prices) => {
    movie_id = Number(movie_id);
    screen_id = Number(screen_id);

    const movie = await prisma.movie.findUnique({
        where: { id: movie_id }
    });

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    const screen = await prisma.screen.findUnique({
        where: { id: screen_id }
    });

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }

    if (new Date(start_time) >= new Date(end_time)) {
        throw new ApiError(400, "Showtime end time must be after start time");
    }
    if (new Date(start_time) <= new Date()) {
        throw new ApiError(400, "Showtime must start in the future");
    }
    if (total_seats > screen.capacity) {
        throw new ApiError(400, "Showtime seats cannot exceed screen capacity");
    }

    const duplicate = await prisma.showtime.findFirst({
        where: {
            screenId: screen_id,
            startTime: { lt: end_time },
            endTime: { gt: start_time }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Showtime already exists");
    }

    const showtime = await prisma.showtime.create({
        data: {
            movieId: movie_id,
            screenId: screen_id,
            startTime: start_time,
            endTime: end_time,
            totalSeats: total_seats,
            prices
        }
    });

    return { ...showtime, prices: Number(showtime.prices) };
};

const updateShowtime = async (id, movie_id, screen_id, start_time, end_time, total_seats, prices) => {
    id = Number(id);

    const existing = await prisma.showtime.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Showtime not found");
    }

    movie_id = Number(movie_id ?? existing.movieId);
    screen_id = Number(screen_id ?? existing.screenId);
    start_time = start_time ?? existing.startTime;
    end_time = end_time ?? existing.endTime;
    total_seats = total_seats ?? existing.totalSeats;
    prices = prices ?? existing.prices;

    const movie = await prisma.movie.findUnique({
        where: { id: movie_id }
    });

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    const screen = await prisma.screen.findUnique({
        where: { id: screen_id }
    });

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }
    if (new Date(start_time) >= new Date(end_time)) {
        throw new ApiError(400, "Showtime end time must be after start time");
    }
    if (total_seats > screen.capacity) {
        throw new ApiError(400, "Showtime seats cannot exceed screen capacity");
    }

    const duplicate = await prisma.showtime.findFirst({
        where: {
            screenId: screen_id,
            startTime: { lt: end_time },
            endTime: { gt: start_time },
            id: { not: id }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Showtime already exists");
    }

    const showtime = await prisma.showtime.update({
        where: { id },
        data: {
            movieId: movie_id,
            screenId: screen_id,
            startTime: start_time,
            endTime: end_time,
            totalSeats: total_seats,
            prices
        }
    });

    return { ...showtime, prices: Number(showtime.prices) };
};

const deleteShowtime = async (id) => {
    id = Number(id);

    const existing = await prisma.showtime.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Showtime not found");
    }

    const reservation = await prisma.reservation.findFirst({
        where: { showtimeId: id }
    });

    if (reservation) {
        throw new ApiError(409, "Cannot delete showtime because reservations exist");
    }

    const showtime = await prisma.showtime.delete({
        where: { id }
    });

    return showtime;
};

const getBookedSeats = async (showtimeId) => {
    showtimeId = Number(showtimeId);

    const showtime = await prisma.showtime.findUnique({
        where: { id: showtimeId }
    });

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    await expirePendingReservations(showtimeId);

    const reservations = await prisma.reservation.findMany({
        where: { showtimeId, status: { in: ["PENDING", "CONFIRMED"] } },
        include: {
            seat: {
                select: { id: true, seatNumber: true, seatType: true }
            }
        },
        orderBy: { seat: { seatNumber: "asc" } }
    });

    // Flat list of seats return karte hain
    return reservations.map(r => r.seat);
};

const getSeatAvailability = async (showtimeId) => {
    showtimeId = Number(showtimeId);

    const showtime = await prisma.showtime.findUnique({
        where: { id: showtimeId }
    });

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    await expirePendingReservations(showtimeId);

    const bookedSeats = await prisma.reservation.count({
        where: { showtimeId, status: { in: ["PENDING", "CONFIRMED"] } }
    });

    return {
        totalSeats: showtime.totalSeats,
        bookedSeats,
        availableSeats: showtime.totalSeats - bookedSeats
    };
};

module.exports = {
    getAllShowtimes,
    getShowtimeById,
    createShowtime,
    updateShowtime,
    deleteShowtime,
    getBookedSeats,
    getSeatAvailability
};
