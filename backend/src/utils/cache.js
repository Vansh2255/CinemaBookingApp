const redis = require("../config/redis");

// getOrSet = Cache-Aside (lazy loading) pattern.
// Pehle cache check karte hain, miss ho toh DB se leke cache mein store karte hain.
// Redis down ho toh bhi app chalta hai (graceful degradation) — cache ko ignore karke DB se data milta hai.
const getOrSet = async (key, ttlSeconds, fetchFn) => {
    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error("Redis GET failed:", err.message);
    }

    const data = await fetchFn();

    try {
        await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (err) {
        console.error("Redis SET failed:", err.message);
    }

    return data;
};

// Single key delete
const del = async (key) => {
    try {
        await redis.del(key);
    } catch (err) {
        console.error("Redis DEL failed:", err.message);
    }
};

// Prefix wali saari keys delete (cache invalidation ke liye).
// Redis mein "delete by prefix" natively nahi hota, isliye SCAN use karte hain.
// SCAN blocking nahi hai (KEYS command ke ulat), isliye production-safe hai.
const delByPrefix = async (prefix) => {
    try {
        let cursor = "0";
        do {
            const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
            cursor = next;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
    } catch (err) {
        console.error("Redis SCAN/DEL failed:", err.message);
    }
};

module.exports = { getOrSet, del, delByPrefix };
