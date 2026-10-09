const rateLimit = require("express-rate-limit");
const redis = require("./redis");

// Redis store — limits ko shared + persistent banata hai (multi-instance production).
// In-memory store sirf 1 process/restart tak rehta hai; Redis se saare instances
// ek hi counter share karte hain.
// REDIS_URL set nahi hai (tests / bina Redis ke local) toh MemoryStore use hota hai.
const makeRedisStore = () => {
    if (!process.env.REDIS_URL) return undefined;
    const { RedisStore } = require("rate-limit-redis");
    return new RedisStore({
        // ioredis ka .call(command, ...args) use karte hain
        sendCommand: (command, ...args) => redis.call(command, ...args)
    });
};

// Sab limiters ka common config
const common = {
    store: makeRedisStore(),
    standardHeaders: true, // RateLimit-* response headers bhejo
    legacyHeaders: false,
    // Redis down ho toh request ko block MAT karo (fail-open) — graceful degradation.
    // Rate limiting best-effort hai; core API ko Redis failure se nahi rokna chahiye.
    passOnStoreError: true
};

// Env value ko safe number mein convert karo (invalid/negative ho toh fallback)
const toNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Auth endpoints (login/signup/forgot-password/send-verification-email)
// — brute-force protection (password guessing attack)
const authLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: toNumber(process.env.AUTH_RATE_LIMIT, 10),
    message: { success: false, message: "Too many auth attempts, please try again later." }
});

// Booking create — seat-hoarding / API abuse se bachao.
// sirf POST (create) count hota hai, GET (list) skip ho jata hai.
const bookingLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: toNumber(process.env.BOOKING_RATE_LIMIT, 20),
    skip: (req) => req.method !== "POST",
    message: { success: false, message: "Too many booking attempts, please slow down." }
});

// Payment create-intent — Stripe API abuse (paise se juda) se bachao
const paymentLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: toNumber(process.env.PAYMENT_RATE_LIMIT, 20),
    message: { success: false, message: "Too many payment attempts, please slow down." }
});

// Global API limiter — generic read/write ke liye
const apiLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: toNumber(process.env.API_RATE_LIMIT, 100),
    message: { success: false, message: "Too many requests, please try again later." }
});

module.exports = { authLimiter, bookingLimiter, paymentLimiter, apiLimiter };
