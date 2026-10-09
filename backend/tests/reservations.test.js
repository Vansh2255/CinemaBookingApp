const request = require("supertest");
const app = require("../src/app");
const { clearDatabase, seedBookingData, disconnect } = require("./helpers");

let token;
let showtimeId;
let seatId;
let secondSeatId;
let reservationId;

beforeAll(async () => {
    await clearDatabase();

    const data = await seedBookingData();
    showtimeId = data.showtimeId;
    seatId = data.seatId;
    secondSeatId = data.secondSeatId;

    // Booking user ko login karke token lo
    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: data.userEmail, password: data.userPassword });

    token = loginRes.body.accessToken;
});

afterAll(async () => {
    await disconnect();
});

describe("Reservations API", () => {
    test("POST /api/reservations → 201 (successful booking)", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: showtimeId, seat_id: seatId });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.reservation.showtimeId).toBe(showtimeId);
        expect(res.body.reservation.seatId).toBe(seatId);
        expect(res.body.reservation.status).toBe("PENDING");
        reservationId = res.body.reservation.id;
    });

    test("POST /api/reservations duplicate seat → 409", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: showtimeId, seat_id: seatId });

        expect(res.status).toBe(409);
    });

    test("POST /api/reservations without token → 401", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .send({ showtime_id: showtimeId, seat_id: secondSeatId });

        expect(res.status).toBe(401);
    });

    test("GET /api/reservations/my-bookings → 200", async () => {
        const res = await request(app)
            .get("/api/reservations/my-bookings")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.bookings).toBeInstanceOf(Array);
    });

    // ⭐ Sabse important test: race condition ka proof
    // 5 concurrent requests same seat book karne ki koshish karte hain
    // FOR UPDATE lock ki wajah se exactly 1 hi success hona chahiye
    test("⭐ Concurrency: 5 parallel same-seat bookings → exactly 1 success", async () => {
        const unauthenticated = await request(app).get(`/api/reservations/${reservationId}`);
        expect(unauthenticated.status).toBe(401);

        await request(app)
            .post("/api/auth/signup")
            .send({ name: "Other User", email: "other@test.com", password: "password123" });
        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: "other@test.com", password: "password123" });

        const otherUser = await request(app)
            .get(`/api/reservations/${reservationId}`)
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(otherUser.status).toBe(403);

        const requests = Array.from({ length: 5 }, () =>
            request(app)
                .post("/api/reservations")
                .set("Authorization", `Bearer ${token}`)
                .send({ showtime_id: showtimeId, seat_id: secondSeatId })
        );

        const responses = await Promise.all(requests);
        const statuses = responses.map((r) => r.status);

        expect(statuses.filter((s) => s === 201)).toHaveLength(1);
        expect(statuses.filter((s) => s === 409)).toHaveLength(4);
    });
});
