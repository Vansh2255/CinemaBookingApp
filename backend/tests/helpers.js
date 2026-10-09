const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

// Saari tables clear karo — har test file clean state se shuru ho.
// CASCADE se order matter nahi karta, RESTART IDENTITY se IDs 1 se restart hote hain.
const clearDatabase = async () => {
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
            reservations, showtimes, seats, screens, theatres,
            movie_genres, movies, genres, refresh_tokens, users, coupons
        RESTART IDENTITY CASCADE
    `);
};

// Booking test ke liye poora data setup:
// user + movie + theatre + screen + seats + showtime
// Ye sab prisma se directly create karte hain (fast + deterministic)
const seedBookingData = async () => {
    const password = "password123";

    const user = await prisma.user.create({
        data: {
            name: "Booking User",
            email: "booking@test.com",
            password: await bcrypt.hash(password, 10),
            role: "user"
        }
    });

    const movie = await prisma.movie.create({
        data: {
            title: "Inception",
            duration: 148,
            language: "English",
            releaseDate: new Date("2026-01-01")
        }
    });

    const theatre = await prisma.theatre.create({
        data: { name: "PVR Test", location: "Mumbai" }
    });

    const screen = await prisma.screen.create({
        data: {
            theatreId: theatre.id,
            name: "Screen 1",
            capacity: 50,
            screenType: "2D"
        }
    });

    // 5 seats banate hain
    const seatNumbers = ["A1", "A2", "A3", "A4", "A5"];
    const seats = [];
    for (const seatNumber of seatNumbers) {
        const seat = await prisma.seat.create({
            data: {
                screenId: screen.id,
                seatNumber,
                seatType: "Regular"
            }
        });
        seats.push(seat);
    }

    const showtime = await prisma.showtime.create({
        data: {
            movieId: movie.id,
            screenId: screen.id,
            startTime: new Date("2026-09-01T10:00:00.000Z"),
            endTime: new Date("2026-09-01T12:00:00.000Z"),
            totalSeats: 50,
            prices: 250.0
        }
    });

    return {
        userEmail: user.email,
        userPassword: password,
        showtimeId: showtime.id,
        seatId: seats[0].id,
        secondSeatId: seats[1].id,
        movieId: movie.id,
        screenId: screen.id
    };
};

// Test khatam hone par Prisma connection close karo (taaki Jest exit ho jaye)
const disconnect = async () => {
    await prisma.$disconnect();
};

module.exports = {
    clearDatabase,
    seedBookingData,
    disconnect
};
