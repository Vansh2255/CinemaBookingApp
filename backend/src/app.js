const express = require("express");
require("dotenv").config();

const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");

const app = express();

// Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
// CSP disabled because Swagger UI needs inline scripts; configure a proper CSP in production
app.use(helmet({ contentSecurityPolicy: false }));

// CORS - restrict to allowed origins (default: all, for development)
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Reverse proxy ke piche (nginx/Docker) sahi client IP ke liye trust proxy chahiye.
// 0 = koi proxy nahi (local dev), 1 = ek proxy hop. nginx/ALB ke piche 1 rakho.
// Ye zaroori hai warna saare users ka IP proxy ka IP dikhega aur rate limiting
// sabko ek hi user samajh kar block kar degi.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
}

// Stripe webhook — raw body chahiye signature verify karne ke liye.
// Isliye ye express.json se PEHLE mount hota hai (warna json body consume kar deta).
const paymentsController = require("./modules/payments/payments.controller");

app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentsController.webhook
);

// Body parser (limit payload size to prevent large-payload abuse)
app.use(express.json({ limit: "100kb" }));

// Rate limiting — tiered limiters (config/rate-limit.js mein defined hain)
const {
    authLimiter,
    bookingLimiter,
    paymentLimiter,
    apiLimiter
} = require("./config/rate-limit");

// Strict limiter on auth endpoints (must come before the global limiter)
// Tests mein rate limiting disable karte hain (warna false 429 failures aayenge)
if (process.env.NODE_ENV !== "test") {
    // Brute-force protection
    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/signup", authLimiter);
    app.use("/api/auth/forgot-password", authLimiter);
    app.use("/api/auth/send-verification-email", authLimiter);

    // Sensitive write endpoints — stricter limits (seat-hoarding / Stripe abuse)
    app.use("/api/reservations", bookingLimiter);
    app.use("/api/payments/create-intent", paymentLimiter);

    // Global API limiter (sabse last, generic)
    app.use("/api", apiLimiter);
}

// Swagger
const swaggerSpec = require("./docs/swagger");

// Middlewares
const authMiddleware = require("./middleware/auth.middleware");
const authorize = require("./middleware/role.middleware");

// Routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const movieRoutes = require("./modules/movies/movies.routes");
const genreRoutes = require("./modules/genres/genres.routes");
const movieGenreRoutes = require("./modules/movieGenres/movieGenres.routes");
const theatreRoutes = require("./modules/theatres/theatres.routes");
const screensRoutes = require("./modules/screens/screens.routes");
const seatRoutes = require("./modules/seats/seats.routes");
const showtimeRoutes = require("./modules/showtimes/showtimes.routes");
const reservationRoutes = require("./modules/reservations/reservation.routes");
const paymentRoutes = require("./modules/payments/payments.routes");
const errorHandler = require("./middleware/error.middleware");


app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Movie Reservation API is running!"
    });
});

// Health check — liveness + readiness.
// DB down hona CRITICAL hai (503) → load balancer/orchestrator request is instance pe nahi bhejega.
// Redis down hona OPTIONAL hai (graceful degradation) → 200 ke saath "down" mark karte hain.
const prisma = require("./config/prisma");
const redis = require("./config/redis");

app.get("/health", async (req, res) => {
    const checks = {};
    let status = 200;

    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "up";
    } catch (err) {
        checks.database = "down";
        status = 503;
    }

    if (process.env.REDIS_URL) {
        try {
            await redis.ping();
            checks.redis = "up";
        } catch (err) {
            checks.redis = "down";
        }
    } else {
        checks.redis = "disabled";
    }

    res.status(status).json({
        status: status === 200 ? "ok" : "degraded",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks
    });
});


app.use("/api/auth", authRoutes);


app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/movie-genres", movieGenreRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/screens", screensRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/showtimes", showtimeRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payments", paymentRoutes);


app.get("/profile", authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

app.get(
    "/admin",
    authMiddleware,
    authorize("admin", "super_admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome Admin",
            user: req.user
        });
    }
);


app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);


app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use(errorHandler);

// App ko export karte hain taaki tests bina server start kiye
// supertest se directly app ko hit kar sakein.
// Server start karna ab server.js ka kaam hai.
module.exports = app;
