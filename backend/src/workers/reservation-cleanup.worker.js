require("dotenv").config();

const { Queue, Worker } = require("bullmq");
const { expireAllExpiredReservations } = require("../modules/reservations/reservation-cleanup.service");

const connection = { url: process.env.REDIS_URL };

// Maintenance queue — repeatable jobs yahan rehte hain (har interval par chalta hai)
const queue = new Queue("maintenance", { connection });

const CLEANUP_INTERVAL_MS = Number(process.env.RESERVATION_CLEANUP_INTERVAL_MS) || 60_000;

// Repeatable job register karo (CommonJS mein top-level await nahi hota, isliye IIFE).
// jobId fixed rakhte hain taaki worker dobara start karne par duplicate job na bane.
(async () => {
    await queue.add(
        "expire-reservations",
        {},
        {
            repeat: { every: CLEANUP_INTERVAL_MS },
            jobId: "expire-reservations"
        }
    );
    console.log(`📅 Repeatable job registered: expire-reservations (every ${CLEANUP_INTERVAL_MS}ms)`);
})().catch((err) => {
    console.error("❌ Failed to register repeatable job:", err.message);
});

// Worker — "maintenance" queue se job utha kar cleanup chalata hai
const worker = new Worker(
    "maintenance",
    async (job) => {
        if (job.name !== "expire-reservations") return;
        const expired = await expireAllExpiredReservations();
        if (expired > 0) {
            console.log(`🧹 Expired ${expired} reservation(s)`);
        }
    },
    { connection }
);

worker.on("completed", (job) => console.log(`✅ ${job.name} done`));
worker.on("failed", (job, err) => console.error(`❌ ${job.name} failed: ${err.message}`));

console.log("🧹 Reservation cleanup worker started");
