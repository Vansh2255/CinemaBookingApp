const request = require("supertest");
const prisma = require("../src/config/prisma");
const { clearDatabase, seedBookingData, disconnect } = require("./helpers");

// Queue ko mock karte hain — real Redis nahi chahiye, sirf "add call hua ya nahi" check karna hai.
// "mock"-prefixed variable isliye allowed hai kyunki jest.mock factory mein hoisted hota hai.
const mockQueueAdd = jest.fn().mockResolvedValue({ id: "job-1" });

jest.mock("../src/config/queue", () => ({ add: mockQueueAdd }));

// Stripe ko bhi mock (payment notification test ke liye webhook flow chahiye)
jest.mock("stripe", () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: jest.fn().mockResolvedValue({
                id: "pi_test_123",
                client_secret: "pi_secret_test_123"
            })
        },
        webhooks: {
            constructEvent: jest.fn().mockReturnValue({
                type: "payment_intent.succeeded",
                data: { object: { id: "pi_test_123" } }
            })
        }
    }));
});

const app = require("../src/app");

let token;
let data;

beforeAll(async () => {
    await clearDatabase();
    data = await seedBookingData();

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: data.userEmail, password: data.userPassword });
    token = loginRes.body.accessToken;
});

afterAll(async () => {
    await disconnect();
});

describe("Email notifications (BullMQ)", () => {
    test("booking → enqueues booking-confirmation email", async () => {
        mockQueueAdd.mockClear();

        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: data.showtimeId, seat_id: data.seatId });

        expect(res.status).toBe(201);

        expect(mockQueueAdd).toHaveBeenCalledTimes(1);
        expect(mockQueueAdd).toHaveBeenCalledWith(
            "booking-confirmation",
            expect.objectContaining({ to: data.userEmail })
        );
    });

    test("payment success → enqueues payment-confirmation email", async () => {
        mockQueueAdd.mockClear();

        // Payment ke liye fresh reservation (doosri seat)
        const bookRes = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: data.showtimeId, seat_id: data.secondSeatId });

        const reservationId = bookRes.body.reservation.id;

        await request(app)
            .post("/api/payments/create-intent")
            .set("Authorization", `Bearer ${token}`)
            .send({ reservation_id: reservationId });

        // Booking ka enqueue clear — sirf payment notification dekhna hai
        mockQueueAdd.mockClear();

        await request(app)
            .post("/api/payments/webhook")
            .set("stripe-signature", "test_signature")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({}));

        expect(mockQueueAdd).toHaveBeenCalledWith(
            "payment-confirmation",
            expect.objectContaining({ to: data.userEmail })
        );
    });
});
