const { Queue } = require("bullmq");

// Email queue — Redis-backed (BullMQ).
// REDIS_URL set ho (prod/dev) toh real queue, warna no-op fallback.
// (Tests mein real Redis nahi chalta, aur app bina queue ke bhi chalta hai —
//  notifications best-effort hoti hain, core flow ko break nahi karti.)
let emailQueue;

if (process.env.REDIS_URL) {
    emailQueue = new Queue("emails", {
        connection: { url: process.env.REDIS_URL }
    });
} else {
    emailQueue = {
        add: async () => ({ id: null })
    };
}

module.exports = emailQueue;
