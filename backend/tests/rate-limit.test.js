const request = require("supertest");
const express = require("express");
const { authLimiter, bookingLimiter } = require("../src/config/rate-limit");

// Rate limiting ko directly test karte hain (full app mein NODE_ENV=test ki wajah se
// limiters disabled hote hain). Ye limiters ko ek fresh express app pe mount karke
// verify karte hain ki limit cross karne par 429 aata hai.

describe("Rate limiting", () => {
    test("authLimiter: limit (10) ke baad 429 aata hai", async () => {
        const app = express();
        app.use("/api/auth/login", authLimiter);
        app.post("/api/auth/login", (req, res) => res.json({ success: true }));

        // 10 attempts (limit ke andar) → 200
        for (let i = 0; i < 10; i++) {
            const res = await request(app).post("/api/auth/login").send({});
            expect(res.status).toBe(200);
        }

        // 11th attempt → 429 blocked
        const blocked = await request(app).post("/api/auth/login").send({});
        expect(blocked.status).toBe(429);
        expect(blocked.body.success).toBe(false);
    });

    test("bookingLimiter: GET (list) count nahi hota, sirf POST hota hai", async () => {
        const app = express();
        app.use("/api/reservations", bookingLimiter);
        app.get("/api/reservations", (req, res) => res.json({ success: true }));
        app.post("/api/reservations", (req, res) => res.json({ success: true }));

        // Bohat saare GET requests — skip hone chahiye (count nahi hona)
        for (let i = 0; i < 30; i++) {
            const res = await request(app).get("/api/reservations");
            expect(res.status).toBe(200);
        }

        // 20 POST attempts (booking limit) → 200
        for (let i = 0; i < 20; i++) {
            const res = await request(app).post("/api/reservations").send({});
            expect(res.status).toBe(200);
        }

        // 21st POST → 429 (GET requests ne count nahi kiya tha)
        const blocked = await request(app).post("/api/reservations").send({});
        expect(blocked.status).toBe(429);
    });
});
