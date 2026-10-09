const Redis = require("ioredis");

// Redis connection sirf tab banate hain jab REDIS_URL set ho (production/development).
// Tests mein REDIS_URL set nahi hota, isliye no-op client use hota hai —
// cache silently disabled rehta hai aur app bina Redis ke bhi chalta hai.
let redis;

if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);

    redis.on("connect", () => {
        console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
        // Error log karte hain but app crash nahi hone dete (cache optional hai)
        console.error("❌ Redis error:", err.message);
    });
} else {
    // No-op fallback: har method dummy value return karta hai (cache disabled)
    redis = {
        get: async () => null,
        set: async () => "OK",
        del: async () => 0,
        scan: async () => ["0", []],
        ping: async () => "PONG"
    };
}

module.exports = redis;
