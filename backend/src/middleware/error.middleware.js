const errorHandler = (err, req, res, next) => {

    console.error(err);

    // Convert expected Prisma errors to useful API responses instead of leaking
    // a generic 500 (for example, duplicate email/profile updates).
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (err.code === "P2002") {
        statusCode = 409;
        message = "A record with this value already exists";
    } else if (err.code === "P2025") {
        statusCode = 404;
        message = "Record not found";
    }

    res.status(statusCode).json({
        success: false,
        message,

        ...(process.env.NODE_ENV !== "production" && {
            stack: err.stack
        })
    });

};

module.exports = errorHandler;
