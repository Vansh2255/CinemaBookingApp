const prisma = require("../src/config/prisma");
const { clearDatabase, seedBookingData, disconnect } = require("./helpers");
const { expireAllExpiredReservations } = require("../src/modules/reservations/reservation-cleanup.service");

let data;
let userId;

beforeAll(async () => {
    await clearDatabase();
    data = await seedBookingData();

    const user = await prisma.user.findUnique({ where: { email: data.userEmail } });
    userId = user.id;
});

afterAll(async () => {
    await disconnect();
});

describe("expireAllExpiredReservations (background cleanup)", () => {
    test("expired PENDING → EXPIRED, non-expired PENDING untouched", async () => {
        // Hold expire ho chuki hai (past expiresAt)
        const expired = await prisma.reservation.create({
            data: {
                userId,
                showtimeId: data.showtimeId,
                seatId: data.seatId,
                status: "PENDING",
                expiresAt: new Date(Date.now() - 60_000)
            }
        });

        // Hold abhi active hai (future expiresAt)
        const active = await prisma.reservation.create({
            data: {
                userId,
                showtimeId: data.showtimeId,
                seatId: data.secondSeatId,
                status: "PENDING",
                expiresAt: new Date(Date.now() + 10 * 60_000)
            }
        });

        const count = await expireAllExpiredReservations();

        expect(count).toBe(1);

        const expiredAfter = await prisma.reservation.findUnique({ where: { id: expired.id } });
        const activeAfter = await prisma.reservation.findUnique({ where: { id: active.id } });

        expect(expiredAfter.status).toBe("EXPIRED");
        expect(activeAfter.status).toBe("PENDING");
    });

    test("CONFIRMED reservations (even with past expiresAt) never touched", async () => {
        // Confirmed reservation ka expiresAt past ho bhi toh EXPIRED nahi karna
        const confirmed = await prisma.reservation.create({
            data: {
                userId,
                showtimeId: data.showtimeId,
                seatId: data.seatId,
                status: "CONFIRMED",
                expiresAt: new Date(Date.now() - 60_000)
            }
        });

        const count = await expireAllExpiredReservations();

        expect(count).toBe(0);

        const confirmedAfter = await prisma.reservation.findUnique({ where: { id: confirmed.id } });
        expect(confirmedAfter.status).toBe("CONFIRMED");
    });
});
