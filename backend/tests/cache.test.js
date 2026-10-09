const request = require("supertest");
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");
const { clearDatabase, disconnect } = require("./helpers");

// In-memory fake Redis (Map-based) — real Redis ki zaroorat nahi tests mein.
// Cache behavior ko hum khud control karte hain taaki miss/hit/invalidation verify kar sakein.
const mockStore = new Map();

// jest.mock hoisted hota hai, isliye factory mein sirf "mock" prefix wale
// variables hi reference kar sakte hain. Implementations beforeAll mein set karte hain.
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisScan = jest.fn();

jest.mock("../src/config/redis", () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    scan: mockRedisScan
}));

const app = require("../src/app");

let adminToken;

beforeAll(async () => {
    // Fake Redis ke methods ko real in-memory behavior do
    mockRedisGet.mockImplementation(async (key) =>
        mockStore.has(key) ? mockStore.get(key) : null
    );

    mockRedisSet.mockImplementation(async (key, val) => {
        mockStore.set(key, val);
        return "OK";
    });

    mockRedisDel.mockImplementation(async (...keys) => {
        keys.forEach((k) => mockStore.delete(k));
        return keys.length;
    });

    mockRedisScan.mockImplementation(async (_cursor, _op, pattern) => {
        const prefix = String(pattern).replace(/\*$/, "");
        const matched = Array.from(mockStore.keys()).filter((k) => k.startsWith(prefix));
        return ["0", matched];
    });

    await clearDatabase();

    // Admin user (directly prisma se, kyunki signup hamesha 'user' role deta hai)
    await prisma.user.create({
        data: {
            name: "Admin",
            email: "admin@test.com",
            password: await bcrypt.hash("admin123", 10),
            role: "admin"
        }
    });

    // Ek movie bana do taaki list/by-id tests mein data ho
    await prisma.movie.create({
        data: {
            title: "Inception",
            duration: 148,
            language: "English",
            releaseDate: new Date("2026-01-01")
        }
    });

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

describe("Redis caching", () => {
    test("GET /api/movies → cache MISS stores response, cache HIT reuses it", async () => {
        mockStore.clear();
        mockRedisSet.mockClear();

        // Pehla request: cache miss → DB se fetch → set called
        const first = await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(first.status).toBe(200);
        expect(mockRedisSet).toHaveBeenCalledTimes(1);

        // Doosra request (same query): cache hit → set dobara call NAHI hona chahiye
        const second = await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(second.status).toBe(200);
        expect(mockRedisSet).toHaveBeenCalledTimes(1); // abhi bhi 1, koi naya store nahi
    });

    test("GET /api/movies/:id → cached by id", async () => {
        mockStore.clear();

        // list se ek movie ki id lo
        const listRes = await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);
        const movieId = listRes.body.movies[0].id;

        await request(app)
            .get(`/api/movies/${movieId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        // movies:id:<id> key cache mein store honi chahiye
        const idKeys = Array.from(mockStore.keys()).filter(
            (k) => k.startsWith(`movies:id:${movieId}`)
        );
        expect(idKeys.length).toBe(1);
    });

    test("POST /api/movies → invalidates movie cache", async () => {
        // Pehle cache populate karo
        mockStore.clear();
        await request(app)
            .get("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(mockStore.size).toBeGreaterThan(0);

        mockRedisDel.mockClear();

        // Naya movie create karo
        const res = await request(app)
            .post("/api/movies")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(moviePayload);
        expect(res.status).toBe(201);

        // del call hui (invalidation), aur movies:list cache clear ho gaya
        expect(mockRedisDel).toHaveBeenCalled();
        const listKeys = Array.from(mockStore.keys()).filter((k) =>
            k.startsWith("movies:list:")
        );
        expect(listKeys.length).toBe(0);
    });
});
