const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");
const { clearDatabase, disconnect } = require("./helpers");

let adminToken;

beforeAll(async () => {
    await clearDatabase();

    // Admin user create karo (signup hamesha 'user' role deta hai,
    // isliye admin ko directly prisma se banate hain)
    await prisma.user.create({
        data: {
            name: "Admin",
            email: "admin@test.com",
            password: await bcrypt.hash("admin123", 10),
            role: "admin"
        }
    });

    // Login se admin token lo
    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@test.com", password: "admin123" });

    adminToken = loginRes.body.accessToken;
});

afterAll(async () => {
    await disconnect();
});

const moviePayload = {
    title: "Interstellar",
    description: "A space epic",
    poster_url: "https://example.com/poster.jpg",
    duration: 169,
    language: "English",
    release_date: "2014-11-07"
};

describe("Movies API", () => {
    test("POST /api/movies → 201 (admin can create)", async () => {
        const res = await request(app)
            .post("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(moviePayload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.movie.title).toBe("Interstellar");
    });

    test("POST /api/movies as normal user → 403 (forbidden)", async () => {
        // normal user signup + login
        await request(app)
            .post("/api/auth/signup")
            .send({ name: "Normal", email: "normal@test.com", password: "password123" });

        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: "normal@test.com", password: "password123" });

        const userToken = loginRes.body.accessToken;

        const res = await request(app)
            .post("/api/movies")
            .set("Authorization", `Bearer ${userToken}`)
            .send(moviePayload);

        expect(res.status).toBe(403);
    });

    test("GET /api/movies → 200 + list", async () => {
        const res = await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.movies).toBeInstanceOf(Array);
        expect(res.body.movies.length).toBeGreaterThan(0);
    });

    test("GET /api/movies?search=Inter → filter works", async () => {
        const res = await request(app)
            .get("/api/movies?search=Inter")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.movies.length).toBeGreaterThan(0);
        expect(res.body.movies[0].title).toBe("Interstellar");
    });

    test("GET /api/movies/:id → 200", async () => {
        // list se pehli movie ki id lo
        const listRes = await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);

        const movieId = listRes.body.movies[0].id;

        const res = await request(app)
            .get(`/api/movies/${movieId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.movie.id).toBe(movieId);
    });
});
