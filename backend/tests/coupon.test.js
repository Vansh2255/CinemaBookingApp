const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const { clearDatabase, seedBookingData, disconnect } = require("./helpers");

// Coupon usageCount increment + usageLimit enforcement ka test.
// Ye bug fix verify karta hai: pehle usageCount sirf READ hota tha (limit check),
// increment kahin nahi hota tha — isliye usageLimit kabhi trigger nahi hota tha.

let token;
let showtimeId;
let seatId;
let secondSeatId;
let coupon;

beforeAll(async () => {
    await clearDatabase();

    const data = await seedBookingData();
    showtimeId = data.showtimeId;
    seatId = data.seatId;
    secondSeatId = data.secondSeatId;

    // usageLimit = 1 wala coupon — dusri baar use karne par block hona chahiye
    coupon = await prisma.coupon.create({
        data: {
            code: "WELCOME10",
            discountType: "PERCENTAGE",
            discountValue: 10,
            usageLimit: 1,
            expiresAt: new Date("2026-12-31T00:00:00.000Z")
        }
    });

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: data.userEmail, password: data.userPassword });
    token = loginRes.body.accessToken;
});

afterAll(async () => {
    await disconnect();
});

describe("Coupon usage tracking", () => {
    test("coupon apply → discount lagta hai + usageCount increment hota hai", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: showtimeId, seat_id: seatId, coupon_code: "WELCOME10" });

        expect(res.status).toBe(201);
        expect(res.body.reservation.couponId).toBe(coupon.id);
        // 10% discount (250 → 225)
        expect(Number(res.body.reservation.finalAmount)).toBeLessThan(250);

        const dbCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
        expect(dbCoupon.usageCount).toBe(1);
    });

    test("usageLimit (1) cross karne par booking block + usageCount same rehta hai", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: showtimeId, seat_id: secondSeatId, coupon_code: "WELCOME10" });

        expect(res.status).toBe(400);

        // Transaction rollback → usageCount abhi bhi 1 (increment nahi hua)
        const dbCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
        expect(dbCoupon.usageCount).toBe(1);
    });

    test("invalid coupon code → 400, reservation nahi banta", async () => {
        const res = await request(app)
            .post("/api/reservations")
            .set("Authorization", `Bearer ${token}`)
            .send({ showtime_id: showtimeId, seat_id: secondSeatId, coupon_code: "DOESNOTEXIST" });

        expect(res.status).toBe(400);
    });
});
