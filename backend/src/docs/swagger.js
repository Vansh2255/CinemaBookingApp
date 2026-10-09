const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Movie Reservation API",
            version: "1.0.0",
            description:
                "Cinema booking REST API — users browse movies & showtimes, book seats, " +
                "pay via Stripe, and receive email confirmations. Includes JWT auth, " +
                "Redis caching, BullMQ background jobs, and Redis-backed rate limiting.",
            contact: {
                name: "API Support",
                email: "support@moviereservation.com"
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT"
            }
        },
        servers: [
            { url: "http://localhost:5000", description: "Local development" }
        ],
        tags: [
            { name: "Auth", description: "Register, login, token refresh, password & email verification flows" },
            { name: "Users", description: "User profile management" },
            { name: "Movies", description: "Movie CRUD (cached)" },
            { name: "Genres", description: "Genre CRUD" },
            { name: "Movie Genres", description: "Movie ↔ Genre mapping" },
            { name: "Theatres", description: "Theatre CRUD" },
            { name: "Screens", description: "Screen CRUD (belongs to a theatre)" },
            { name: "Seats", description: "Seat CRUD (belongs to a screen)" },
            { name: "Showtimes", description: "Showtime CRUD + seat availability" },
            { name: "Reservations", description: "Booking, cancellation, my bookings" },
            { name: "Payments", description: "Stripe payments — intent, webhook, history" }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        },
        // Har authenticated endpoint ko token chahiye (unless override kiya ho)
        security: [
            { bearerAuth: [] }
        ]
    },

    apis: ["./src/modules/**/*.routes.js"]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
