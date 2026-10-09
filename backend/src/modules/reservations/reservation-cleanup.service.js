const prisma = require("../../config/prisma");

// Saari PENDING reservations jinki seat-hold expire ho chuki hai → EXPIRED mark karo.
// Ye background worker periodically chalata hai, taaki seats turant free hon.
// (createReservation/getMyBookings sirf "on-read" expire karte hain — ye proactive sweep hai.)
const expireAllExpiredReservations = async () => {
    const result = await prisma.reservation.updateMany({
        where: {
            status: "PENDING",
            expiresAt: { lte: new Date() }
        },
        data: { status: "EXPIRED" }
    });

    return result.count;
};

module.exports = { expireAllExpiredReservations };
