const request = require("supertest");
const app = require("../src/app");
const { disconnect } = require("./helpers");

// Health check endpoint ka test — DB up hone par 200 "ok" aana chahiye.
// Redis test env mein disabled rehta hai (REDIS_URL nahi hota), isliye "disabled" expect karte hain.

afterAll(async () => {
    await disconnect();
});

describe("Health check", () => {
    test("GET /health → 200 + ok", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.checks.database).toBe("up");
        expect(res.body.checks.redis).toBe("disabled");
        expect(res.body.uptime).toBeDefined();
    });
});
