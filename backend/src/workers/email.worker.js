require("dotenv").config();

const { Worker } = require("bullmq");
const { sendEmail } = require("../config/mailer");

// Worker "emails" queue se jobs nikaal kar actual email bhejta hai.
// Ye alag process chalna chahiye (taaki API process ko block na kare):
//   node src/workers/email.worker.js
const worker = new Worker(
    "emails",
    async (job) => {
        const { to, subject, text, html } = job.data;
        await sendEmail({ to, subject, text, html });
    },
    {
        connection: { url: process.env.REDIS_URL },
        // Fail ho toh 3 baar retry (exponential backoff) — transient network errors ke liye
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 }
    }
);

worker.on("completed", (job) => {
    console.log(` Email sent: ${job.name}`);
});

worker.on("failed", (job, err) => {
    console.error(` Email failed: ${job.name} — ${err.message}`);
});

console.log("📬 Email worker started (queue: emails)");
