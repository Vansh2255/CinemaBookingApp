const Stripe = require("stripe");

// Stripe ka single instance (singleton pattern, prisma ki tarah)
// Secret key .env se aata hai (STRIPE_SECRET_KEY)
// NOTE: ye TEST mode key honi chahiye (sk_test_...), production mein sk_live_...
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
