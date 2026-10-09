const prisma = require("../../config/prisma");
const stripe = require("../../config/stripe");
const { calculatePrice } = require("../pricing/pricing.service");
const ApiError = require("../../errors/ApiError");
const { sendBookingConfirmation } = require("../../services/notification.service");

const ACTIVE_RESERVATION_STATUSES = ["PENDING", "CONFIRMED"];
const SEAT_HOLD_MINUTES = 10;

const expirePendingReservations = async (client, showtimeId) => client.reservation.updateMany({
    where: {
        showtimeId,
        status: "PENDING",
        expiresAt: { lte: new Date() }
    },
    data: { status: "EXPIRED" }
});

// Joined data (user, showtime->movie, seat) ko flat object mein convert karta hai
const formatReservation = (reservation) => ({
    id: reservation.id,
    userName: reservation.user?.name ?? null,
    movieTitle: reservation.showtime?.movie?.title ?? null,
    startTime: reservation.showtime?.startTime ?? null,
    seatNumber: reservation.seat?.seatNumber ?? null,
    seatType: reservation.seat?.seatType ?? null,
    status: reservation.status
});

const getAllReservations = async () => {

    const reservations = await prisma.reservation.findMany({
        include: {
            user: { select: { id: true, name: true } },
            showtime: {
                select: {
                    id: true,
                    startTime: true,
                    movie: { select: { id: true, title: true } }
                }
            },
            seat: { select: { id: true, seatNumber: true, seatType: true } }
        },
        orderBy: { id: "asc" }
    });

    return reservations.map(formatReservation);
};

const getReservationById = async (id, actor) => {
    id = Number(id);

    const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
            showtime: { include: { movie: true } },
            seat: true
        }
    });

    if (reservation && actor.role !== "admin" && actor.role !== "super_admin" && reservation.userId !== actor.id) {
        throw new ApiError(403, "You can only view your own reservation");
    }

    return reservation;
};

const createReservation = async (user_id, showtime_id, seat_id, coupon_code) => {
    user_id = Number(user_id);
    showtime_id = Number(showtime_id);
    seat_id = Number(seat_id);

    const user = await prisma.user.findUnique({
        where: { id: user_id }
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const showtime = await prisma.showtime.findUnique({
        where: { id: showtime_id },
        include: { movie: { select: { title: true } } }
    });

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }

    if (showtime.startTime <= new Date()) {
        throw new ApiError(400, "Cannot reserve a showtime that has already started");
    }

    const seat = await prisma.seat.findUnique({
        where: { id: seat_id }
    });

    if (!seat) {
        throw new ApiError(404, "Seat not found");
    }

    if (!seat.isActive) {
        throw new ApiError(400, "Seat is not available");
    }

    // Cross-screen check: seat aur showtime same screen ke hone chahiye
    if (seat.screenId !== showtime.screenId) {
        throw new ApiError(400, "Seat does not belong to this showtime");
    }

    // Seat locking: transaction mein showtime row lock karte hain,
    // taaki do concurrent requests same seat book na kar sakein (race condition)
    const reservation = await prisma.$transaction(async (tx) => {
        // Showtime row ko lock karo (SELECT ... FOR UPDATE)
        // Isse same showtime ke saare bookings serialize ho jaate hain
        await tx.$queryRaw`SELECT id FROM showtimes WHERE id = ${showtime_id} FOR UPDATE`;

        // Lock hold karte hue duplicate check
        await expirePendingReservations(tx, showtime_id);
        let coupon = null;
        if (coupon_code) {
            coupon = await tx.coupon.findUnique({ where: { code: coupon_code } });
            if (!coupon || !coupon.isActive || coupon.startsAt > new Date() || coupon.expiresAt <= new Date()) {
                throw new ApiError(400, "Coupon is invalid or expired");
            }

            // usageCount atomically increment karo + usageLimit enforce karo (race-safe).
            // updateMany ek hi UPDATE chalaata hai: "WHERE usage_count < limit" — isliye do
            // concurrent bookings same coupon ko limit se zyada use nahi kar sakti.
            // Agar booking baad mein fail ho jaye (seat already booked), transaction rollback
            // hone se ye increment bhi reverse ho jata hai — coupon waste nahi hota.
            const incremented = await tx.coupon.updateMany({
                where: {
                    id: coupon.id,
                    ...(coupon.usageLimit !== null ? { usageCount: { lt: coupon.usageLimit } } : {})
                },
                data: { usageCount: { increment: 1 } }
            });

            if (incremented.count === 0) {
                throw new ApiError(400, "Coupon usage limit reached");
            }
        }
        const pricing = calculatePrice(showtime, seat, coupon);
        const existing = await tx.reservation.findFirst({
            where: {
                showtimeId: showtime_id,
                seatId: seat_id,
                status: { in: ACTIVE_RESERVATION_STATUSES }
            }
        });

        if (existing) {
            throw new ApiError(409, "Seat already booked");
        }

        return tx.reservation.create({
            data: {
                userId: user_id,
                showtimeId: showtime_id,
                seatId: seat_id,
                status: "PENDING",
                expiresAt: new Date(Date.now() + SEAT_HOLD_MINUTES * 60 * 1000),
                couponId: coupon?.id,
                ...pricing
            }
        });
    });

    // Booking confirm hone par user ko email queue mein daalo (async, non-blocking).
    // Actual email bhejna worker ka kaam hai — API isliye fast rehti hai.
    await sendBookingConfirmation({ user, reservation, showtime, seat });

    return reservation;
};

const updateReservation = async (id, actor, showtime_id, seat_id) => {
    id = Number(id);

    const existing = await prisma.reservation.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Reservation not found");
    }

    if (actor.role !== "admin" && actor.role !== "super_admin") {
        throw new ApiError(403, "Only administrators can update reservations");
    }
    if (existing.status !== "PENDING") {
        throw new ApiError(409, "Only pending reservations can be changed");
    }

    // Ownership never changes through an update.
    showtime_id = showtime_id ?? existing.showtimeId;
    seat_id = seat_id ?? existing.seatId;

    showtime_id = Number(showtime_id);
    seat_id = Number(seat_id);

    const showtime = await prisma.showtime.findUnique({
        where: { id: showtime_id }
    });

    if (!showtime) {
        throw new ApiError(404, "Showtime not found");
    }
    if (showtime.startTime <= new Date()) {
        throw new ApiError(400, "Cannot move a reservation to a showtime that has already started");
    }

    const seat = await prisma.seat.findUnique({
        where: { id: seat_id }
    });

    if (!seat) {
        throw new ApiError(404, "Seat not found");
    }
    if (!seat.isActive) {
        throw new ApiError(400, "Seat is not available");
    }

    if (seat.screenId !== showtime.screenId) {
        throw new ApiError(400, "Seat does not belong to this showtime");
    }

    // Seat locking: transaction mein showtime row lock (race condition rokna)
    const reservation = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM showtimes WHERE id = ${showtime_id} FOR UPDATE`;

        // Duplicate check excluding current reservation
        const seatExists = await tx.reservation.findFirst({
            where: {
                showtimeId: showtime_id,
                seatId: seat_id,
                status: { in: ACTIVE_RESERVATION_STATUSES },
                id: { not: id }
            }
        });

        if (seatExists) {
            throw new ApiError(409, "Seat already booked");
        }

        return tx.reservation.update({
            where: { id },
            data: {
                showtimeId: showtime_id,
                seatId: seat_id,
                status: existing.status
            }
        });
    });

    return reservation;
};

const cancelReservation = async (id, actor) => {
    id = Number(id);

    const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: { payments: true }
    });

    if (!reservation) throw new ApiError(404, "Reservation not found");

    const isAdmin = actor.role === "admin" || actor.role === "super_admin";
    if (!isAdmin && reservation.userId !== actor.id) {
        throw new ApiError(403, "You can only cancel your own reservation");
    }
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) {
        throw new ApiError(409, `Reservation cannot be cancelled from ${reservation.status}`);
    }
    if (reservation.payments.some(payment => payment.status === "SUCCEEDED")) {
        throw new ApiError(409, "Paid reservations cannot be cancelled — request a refund instead");
    }

    const pendingPayment = reservation.payments.find(payment => payment.status === "PENDING");
    if (pendingPayment) {
        // Cancel the provider-side intent first so it cannot later capture funds
        // for a seat we are about to release.
        await stripe.paymentIntents.cancel(pendingPayment.stripePaymentIntentId);
    }

    return prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
            where: { reservationId: id, status: "PENDING" },
            data: { status: "FAILED" }
        });
        return tx.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
    });
};

const deleteReservation = async (id) => {
    id = Number(id);

    const existing = await prisma.reservation.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Reservation not found");
    }

    const payment = await prisma.payment.findUnique({ where: { reservationId: id } });
    if (payment || existing.status !== "PENDING") {
        throw new ApiError(409, "Reservations with payment history or a final status cannot be deleted");
    }

    const reservation = await prisma.reservation.delete({
        where: { id }
    });

    return reservation;
};

const getMyBookings = async (userId) => {
    userId = Number(userId);

    await prisma.reservation.updateMany({
        where: { userId, status: "PENDING", expiresAt: { lte: new Date() } },
        data: { status: "EXPIRED" }
    });

    const reservations = await prisma.reservation.findMany({
        where: { userId },
        include: {
            showtime: {
                select: {
                    id: true,
                    startTime: true,
                    movie: { select: { id: true, title: true } }
                }
            },
            seat: { select: { id: true, seatNumber: true, seatType: true } }
        },
        orderBy: { id: "desc" }
    });

    return reservations.map(formatReservation);
};

module.exports = {
    getAllReservations,
    getReservationById,
    createReservation,
    updateReservation,
    cancelReservation,
    deleteReservation,
    getMyBookings
};
