const request = require("supertest");
const app = require("../src/app");
const { clearDatabase, disconnect } = require("./helpers");

beforeAll(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await disconnect();
});

const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123"
};

// Note: tests isi file mein order mein chalti hain,
// isliye pehla test user create karta hai jo baaki login tests use karti hain
describe("Auth API", () => {
    test("POST /api/auth/signup → 201, user create + password excluded", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send(validUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user).toMatchObject({
            name: "Test User",
            email: "test@example.com",
            role: "user"
        });
        // Security: response mein password kabhi nahi hona chahiye
        expect(res.body.user.password).toBeUndefined();
    });

    test("POST /api/auth/signup duplicate email → 409", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send(validUser);

        expect(res.status).toBe(409);
    });

    test("POST /api/auth/signup invalid (short password) → 400", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ name: "X", email: "bad@test.com", password: "123" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/login correct credentials → 200 + tokens", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: validUser.password });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.user.email).toBe(validUser.email);
    });

    test("POST /api/auth/login wrong password → 401", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: "wrongpass" });

        expect(res.status).toBe(401);
    });

    test("POST /api/auth/refresh-token → 200 + new accessToken", async () => {
        // pehle login karke refreshToken lo
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: validUser.password });

        const { refreshToken } = loginRes.body;

        const res = await request(app)
            .post("/api/auth/refresh-token")
            .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.refreshToken).not.toBe(refreshToken);

        const reusedToken = await request(app)
            .post("/api/auth/refresh-token")
            .send({ refreshToken });
        expect(reusedToken.status).toBe(401);
    });

    test("change password invalidates old credentials", async () => {
        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: validUser.password });

        const change = await request(app)
            .post("/api/auth/change-password")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({ currentPassword: validUser.password, newPassword: "new-password-123" });
        expect(change.status).toBe(200);

        const oldLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: validUser.password });
        expect(oldLogin.status).toBe(401);

        const newLogin = await request(app)
            .post("/api/auth/login")
            .send({ email: validUser.email, password: "new-password-123" });
        expect(newLogin.status).toBe(200);
    });
});
