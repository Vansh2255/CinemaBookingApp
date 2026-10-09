const ApiError = require("../../errors/ApiError");

const seatMultipliers = { Regular: 1, Premium: 1.2, VIP: 1.5, Recliner: 1.8, Couple: 2 };

const calculatePrice = (showtime, seat, coupon) => {
    const start = new Date(showtime.startTime);
    let baseAmount = Number(showtime.prices) * (seatMultipliers[seat.seatType] || 1);

    // Weekend and evening peak-hour pricing are deliberately captured here,
    // then stored as a reservation snapshot so historic receipts stay stable.
    if ([0, 6].includes(start.getDay())) baseAmount *= 1.1;
    if (start.getHours() >= 18 && start.getHours() < 22) baseAmount *= 1.15;
    baseAmount = Number(baseAmount.toFixed(2));

    let discountAmount = 0;
    if (coupon) {
        if (coupon.minOrderAmount && baseAmount < Number(coupon.minOrderAmount)) {
            throw new ApiError(400, "Coupon minimum order amount is not met");
        }
        discountAmount = coupon.discountType === "PERCENTAGE"
            ? baseAmount * (Number(coupon.discountValue) / 100)
            : Number(coupon.discountValue);
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
        discountAmount = Number(Math.min(discountAmount, baseAmount).toFixed(2));
    }

    return { baseAmount, discountAmount, finalAmount: Number((baseAmount - discountAmount).toFixed(2)) };
};

module.exports = { calculatePrice };
