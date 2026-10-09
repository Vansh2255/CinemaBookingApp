const paymentsService = require("./payments.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const createIntent = asyncHandler(async (req, res) => {
    const { reservation_id } = req.body;

    const payment = await paymentsService.createPaymentIntent(
        req.user.id,
        reservation_id
    );

    res.status(201).json({
        success: true,
        payment
    });
});

const webhook = asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];

    const event = paymentsService.constructWebhookEvent(req.body, signature);
    await paymentsService.handleWebhookEvent(event);

    // Stripe ko 200 dena zaroori hai, warna wo webhook retry karta hai
    res.json({ received: true });
});

const getMyPayments = asyncHandler(async (req, res) => {
    const payments = await paymentsService.getMyPayments(req.user.id);

    res.status(200).json({
        success: true,
        payments
    });
});

const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await paymentsService.getPaymentById(req.params.id, req.user.id);

    if (!payment) {
        throw new ApiError(404, "Payment not found");
    }

    res.status(200).json({
        success: true,
        payment
    });
});

const refundPayment = asyncHandler(async (req, res) => {
    const payment = await paymentsService.refundPayment(req.params.id, req.user);

    res.status(200).json({
        success: true,
        message: "Payment refunded",
        payment
    });
});

module.exports = {
    createIntent,
    webhook,
    refundPayment,
    getMyPayments,
    getPaymentById
};
