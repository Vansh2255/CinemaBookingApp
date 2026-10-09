const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const { clearDatabase, seedBookingData, disconnect } = require("./helpers");

// Stripe ko mock karte hain — real API call nahi hoti, test keys ki zaroorat nahi
// jest.mock hoisted hota hai, isliye app load hone se PEHLE stripe replace ho jata hai
jest.mock("stripe", () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: jest.fn().mockResolvedValue({
                id: "pi_test_123",
                client_secret: "pi_secret_test_123"
            })
        },
        refunds: {
            create: jest.fn().mockResolvedValue({ id: "re_test_123" })
        },
        webhooks: {
            constructEvent: jest.fn().mockReturnValue({
                type: "payment_intent.succeeded",
                data: { object: { id: "pi_test_123" } }
            })
        }
    }));
});

let token;
let reservationId;
let paymentId;

beforeAll(async () => {
    await clearDatabase();

    const data = await seedBookingData();

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: data.userEmail, password: data.userPassword });
    token = loginRes.body.accessToken;

    // Payment ke liye pehle ek reservation chahiye
    const resRes = await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${token}`)
        .send({ showtime_id: data.showtimeId, seat_id: data.seatId });

    reservationId = resRes.body.reservation.id;
});

afterAll(async () => {
    await disconnect();
});

describe("Payments API", () => {
    test("POST /api/payments/create-intent → 201 + clientSecret", async () => {
        const res = await request(app)
            .post("/api/payments/create-intent")
            .set("Authorization", `Bearer ${token}`)
            .send({ reservation_id: reservationId });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.payment.status).toBe("PENDING");
        expect(res.body.payment.amount).toBe(250);
        expect(res.body.payment.clientSecret).toBe("pi_secret_test_123");
        paymentId = res.body.payment.id;
    });

    test("POST /api/payments/create-intent without token → 401", async () => {
        const res = await request(app)
            .post("/api/payments/create-intent")
            .send({ reservation_id: reservationId });

        expect(res.status).toBe(401);
    });

    test("POST /api/payments/webhook succeeded → marks payment SUCCEEDED", async () => {
        const res = await request(app)
            .post("/api/payments/webhook")
            .set("stripe-signature", "test_signature")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({}));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);

        // DB mein payment status SUCCEEDED ho jana chahiye
        const payment = await prisma.payment.findFirst({
            where: { reservationId }
        });
        expect(payment.status).toBe("SUCCEEDED");

        const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
        expect(reservation.status).toBe("CONFIRMED");
    });

    test("POST /api/payments/create-intent after success → 409 (reservation no longer pending)", async () => {
        // Webhook success ke baad reservation CONFIRMED ho jata hai.
        // Dobara payment attempt ab "only pending can be paid" (409) deta hai.
        const res = await request(app)
            .post("/api/payments/create-intent")
            .set("Authorization", `Bearer ${token}`)
            .send({ reservation_id: reservationId });

        expect(res.status).toBe(409);
    });

    test("GET /api/payments/my-payments → 200 + list", async () => {
        const res = await request(app)
            .get("/api/payments/my-payments")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.payments).toBeInstanceOf(Array);
        expect(res.body.payments.length).toBeGreaterThan(0);
    });

    test("POST /api/payments/:id/refund → 200 + payment & reservation REFUNDED", async () => {
        const res = await request(app)
            .post(`/api/payments/${paymentId}/refund`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.payment.status).toBe("REFUNDED");

        const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
        expect(reservation.status).toBe("REFUNDED");
    });

    test("POST /api/payments/:id/refund again → 409 (already refunded)", async () => {
        const res = await request(app)
            .post(`/api/payments/${paymentId}/refund`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(409);
    });
});
