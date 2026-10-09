const prisma = require("../../config/prisma");
const stripe = require("../../config/stripe");
const ApiError = require("../../errors/ApiError");
const { sendPaymentConfirmation, sendRefundConfirmation } = require("../../services/notification.service");

// Payment ko flat object mein convert (amount rupees mein)
const formatPayment = (payment) => ({
    id: payment.id,
    reservationId: payment.reservationId,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt
});

const createPaymentIntent = async (userId, reservationId) => {
    reservationId = Number(reservationId);

    // 1. Reservation exists + showtime (price ke liye) saath mein laao
    const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { showtime: true }
    });

    if (!reservation) {
        throw new ApiError(404, "Reservation not found");
    }

    // 2. Security: user sirf apni reservation ka payment kar sakta hai
    if (reservation.userId !== userId) {
        throw new ApiError(403, "You can only pay for your own reservation");
    }

    if (reservation.status !== "PENDING") {
        throw new ApiError(409, "Only pending reservations can be paid");
    }
    if (reservation.expiresAt && reservation.expiresAt <= new Date()) {
        await prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: "EXPIRED" }
        });
        throw new ApiError(409, "Reservation hold has expired");
    }

    // 3. Already paid check (idempotency — double payment rokta hai)
    const existing = await prisma.payment.findUnique({
        where: { reservationId }
    });

    if (existing && existing.status === "SUCCEEDED") {
        throw new ApiError(400, "Reservation already paid");
    }

    // 4. Amount = showtime price (rupees) → paise mein convert
    //    Stripe smallest currency unit use karta hai (INR: 1 rupee = 100 paise)
    const amountRupees = reservation.finalAmount !== null
        ? Number(reservation.finalAmount)
        : Number(reservation.showtime.prices);
    const amountPaise = Math.round(amountRupees * 100);
    const currency = process.env.STRIPE_CURRENCY || "inr";

    // 5. Stripe PaymentIntent create karo
    const paymentIntent = await stripe.paymentIntents.create(
        {
            amount: amountPaise,
            currency,
            metadata: {
                reservationId: String(reservationId),
                userId: String(userId)
            }
        },
        { idempotencyKey: `reservation-payment-${reservationId}` }
    );

    // 6. Payment record save/update karo
    const data = {
        amount: amountRupees,
        currency,
        status: "PENDING",
        stripePaymentIntentId: paymentIntent.id
    };

    const payment = await prisma.payment.upsert({
        where: { reservationId },
        update: data,
        create: { reservationId, ...data }
    });

    // 7. client_secret return karo (frontend ko payment confirm karne ke liye chahiye)
    return {
        ...formatPayment(payment),
        clientSecret: paymentIntent.client_secret
    };
};

// Webhook signature verify + event parse (Stripe se aaya hai ya nahi)
const constructWebhookEvent = (rawBody, signature) => {
    try {
        return stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
    }
};

// Webhook event ko type ke hisaab se handle karo
const handleWebhookEvent = async (event) => {
    switch (event.type) {
        case "payment_intent.succeeded":
            await markPaymentSucceeded(event.data.object.id);
            break;
        case "payment_intent.payment_failed":
            await releaseSeatOnFailure(event.data.object.id);
            break;
        case "charge.refunded":
            // Refund Stripe dashboard se bhi trigger ho sakta hai — DB sync karo.
            // event.data.object Charge hai, isme payment_intent id hoti hai.
            await markPaymentRefunded(event.data.object.payment_intent);
            break;
        default:
            // dusre events ignore
            break;
    }
};

const markPaymentSucceeded = async (stripePaymentIntentId) => {
    const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId }
    });

    if (!payment) return;

    // Transaction confirmed reservation return karti hai (ya null agar skip hua),
    // taaki hum bahar jaane ke baad email bhej sakein.
    const confirmed = await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findUnique({ where: { id: payment.reservationId } });
        // A late webhook must never revive a cancelled or expired reservation.
        if (!reservation || reservation.status !== "PENDING" ||
            (reservation.expiresAt && reservation.expiresAt <= new Date())) {
            if (reservation?.status === "PENDING") {
                await tx.reservation.update({ where: { id: reservation.id }, data: { status: "EXPIRED" } });
            }
            return null;
        }

        await tx.payment.update({
            where: { id: payment.id },
            data: { status: "SUCCEEDED" }
        });
        return tx.reservation.update({
            where: { id: reservation.id },
            data: { status: "CONFIRMED", expiresAt: null }
        });
    });

    // Payment confirm hone par user ko email queue mein daalo (sirf actual confirm pe).
    if (confirmed) {
        const user = await prisma.user.findUnique({ where: { id: confirmed.userId } });
        if (user) {
            await sendPaymentConfirmation({ user, payment });
        }
    }
};

// Payment fail → reservation delete (seat release ho jata hai).
// Payment record bhi cascade delete ho jata hai (reservation ke saath).
const releaseSeatOnFailure = async (stripePaymentIntentId) => {
    const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId }
    });

    if (!payment) return;

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" }
        });
        await tx.reservation.updateMany({
            where: { id: payment.reservationId, status: "PENDING" },
            data: { status: "CANCELLED" }
        });
    });
};

// Refund webhook (charge.refunded) — Stripe dashboard se refund hone par DB sync.
// Idempotent: sirf CONFIRMED reservation ko REFUNDED banata hai (dobara call harmless).
const markPaymentRefunded = async (stripePaymentIntentId) => {
    const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId }
    });

    if (!payment) return;

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" }
        });
        await tx.reservation.updateMany({
            where: { id: payment.reservationId, status: "CONFIRMED" },
            data: { status: "REFUNDED" }
        });
    });
};

// User/Admin ke liye refund endpoint — Stripe refund + DB status update.
// Sirf SUCCEEDED payment + CONFIRMED reservation hi refund ho sakti hai.
const refundPayment = async (paymentId, actor) => {
    paymentId = Number(paymentId);

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { reservation: true }
    });

    if (!payment) throw new ApiError(404, "Payment not found");

    const isAdmin = actor.role === "admin" || actor.role === "super_admin";
    if (!isAdmin && payment.reservation.userId !== actor.id) {
        throw new ApiError(403, "You can only refund your own payment");
    }

    if (payment.status !== "SUCCEEDED") {
        throw new ApiError(409, `Payment cannot be refunded from ${payment.status}`);
    }
    if (payment.reservation.status !== "CONFIRMED") {
        throw new ApiError(409, `Reservation cannot be refunded from ${payment.reservation.status}`);
    }

    // Stripe refund (synchronous). Idempotency key se retry-safe hai — agar API retry
    // ho jaye toh Stripe duplicate refund nahi banata.
    await stripe.refunds.create(
        { payment_intent: payment.stripePaymentIntentId },
        { idempotencyKey: `refund-payment-${payment.id}` }
    );

    const refunded = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" }
        });
        // Reservation REFUNDED → seat release ho jata hai (ACTIVE statuses mein nahi)
        await tx.reservation.update({
            where: { id: payment.reservationId },
            data: { status: "REFUNDED" }
        });
        return updatedPayment;
    });

    const user = await prisma.user.findUnique({ where: { id: payment.reservation.userId } });
    if (user) {
        await sendRefundConfirmation({ user, payment });
    }

    return formatPayment(refunded);
};

const getMyPayments = async (userId) => {
    const payments = await prisma.payment.findMany({
        where: {
            reservation: { userId }
        },
        orderBy: { id: "desc" }
    });

    return payments.map(formatPayment);
};

const getPaymentById = async (id, userId) => {
    id = Number(id);

    const payment = await prisma.payment.findUnique({
        where: { id },
        include: { reservation: true }
    });

    if (!payment) {
        return null;
    }

    // User sirf apna hi payment dekh sakta hai
    if (payment.reservation.userId !== userId) {
        throw new ApiError(403, "You can only view your own payment");
    }

    return formatPayment(payment);
};

module.exports = {
    createPaymentIntent,
    constructWebhookEvent,
    handleWebhookEvent,
    refundPayment,
    getMyPayments,
    getPaymentById
};
