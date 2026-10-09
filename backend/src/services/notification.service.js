const emailQueue = require("../config/queue");

// Email ko Redis-backed queue mein daalta hai (async, non-blocking).
// Actual send karna worker ka kaam hai — isliye API fast rehti hai.
// Agar queue down ho ya enqueue fail ho, toh main flow (booking/payment)
// ko break nahi karte — notifications best-effort hoti hain.
const enqueueEmail = async (name, data) => {
    try {
        await emailQueue.add(name, data);
    } catch (err) {
        console.error("Failed to enqueue email:", err.message);
    }
};

const sendBookingConfirmation = async ({ user, reservation, showtime, seat }) => {
    const movieTitle = showtime?.movie?.title ?? "your movie";
    const startTime = showtime?.startTime
        ? new Date(showtime.startTime).toLocaleString()
        : "";

    await enqueueEmail("booking-confirmation", {
        to: user.email,
        subject: `🎬 Booking confirmed: ${movieTitle}`,
        text: `Hi ${user.name}, your seat ${seat.seatNumber} for ${movieTitle} at ${startTime} is reserved.`,
        html: `
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your booking is confirmed ✅</p>
            <ul>
                <li>Movie: <strong>${movieTitle}</strong></li>
                <li>Seat: <strong>${seat.seatNumber}</strong> (${seat.seatType})</li>
                <li>Time: ${startTime}</li>
                <li>Reservation ID: ${reservation.id}</li>
            </ul>
            <p>Complete your payment to confirm the seat.</p>
        `
    });
};

const sendPaymentConfirmation = async ({ user, payment }) => {
    await enqueueEmail("payment-confirmation", {
        to: user.email,
        subject: "🎉 Payment successful",
        text: `Hi ${user.name}, your payment of ₹${Number(payment.amount)} was successful.`,
        html: `
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your payment of <strong>₹${Number(payment.amount)}</strong> was successful ✅</p>
            <p>Reservation ID: ${payment.reservationId}</p>
            <p>Enjoy your movie! 🍿</p>
        `
    });
};

const sendRefundConfirmation = async ({ user, payment }) => {
    await enqueueEmail("refund-confirmation", {
        to: user.email,
        subject: "💸 Refund processed",
        text: `Hi ${user.name}, your payment of ₹${Number(payment.amount)} has been refunded.`,
        html: `
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your payment of <strong>₹${Number(payment.amount)}</strong> has been refunded 💸</p>
            <p>Reservation ID: ${payment.reservationId}</p>
            <p>The seat has been released. We hope to see you again! 🍿</p>
        `
    });
};

module.exports = { sendBookingConfirmation, sendPaymentConfirmation, sendRefundConfirmation };
