const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");
const cache = require("../../utils/cache");

// Movie ke nested movieGenres ko flat genres array mein convert karta hai
const formatMovie = (movie) => ({
    id: movie.id,
    title: movie.title,
    description: movie.description,
    posterUrl: movie.posterUrl,
    duration: movie.duration,
    language: movie.language,
    releaseDate: movie.releaseDate,
    createdAt: movie.createdAt,
    genres: movie.movieGenres.map(mg => mg.genre)
});

const getAllMovies = async (page, limit, search, sort, language, genre) => {

    // Cache key mein saare query params include karte hain —
    // warna alag-alag filters ka data ek hi key pe collide ho jayega
    const cacheKey = `movies:list:${page}:${limit}:${search}:${sort}:${language}:${genre}`;

    // Cache-Aside: pehle Redis check, miss ho toh DB se fetch karke cache mein store
    return cache.getOrSet(cacheKey, 60, async () => {
        const offset = (page - 1) * limit;

        const allowedSortFields = ["id", "title", "createdAt", "releaseDate", "duration"];

        let orderBy = { id: 'asc' };

        if (sort) {
            const direction = sort.startsWith("-") ? "desc" : "asc";
            const field = sort.replace("-", "");

            if (allowedSortFields.includes(field)) {
                orderBy = { [field]: direction };
            }
        }

        // Dynamic where conditions
        const where = {};

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (language) {
            where.language = { contains: language, mode: 'insensitive' };
        }

        if (genre) {
            // Many-to-many filter: movie ke kisi bhi genre ka naam match ho
            where.movieGenres = {
                some: {
                    genre: { name: { contains: genre, mode: 'insensitive' } }
                }
            };
        }

        const totalRecords = await prisma.movie.count({ where });

        const movies = await prisma.movie.findMany({
            where,
            include: {
                movieGenres: {
                    include: {
                        genre: {
                            select: { id: true, name: true, description: true }
                        }
                    }
                }
            },
            orderBy,
            skip: offset,
            take: limit
        });

        return {
            movies: movies.map(formatMovie),
            totalRecords
        };
    });

};

const getMovieById = async (id) => {
    id = Number(id);
    const cacheKey = `movies:id:${id}`;

    // null wali entries cache nahi hoti (getOrSet null ko miss treat karta hai),
    // isliye "movie not found" hamesha DB se fresh check hota hai
    return cache.getOrSet(cacheKey, 60, async () => {
        const movie = await prisma.movie.findUnique({
            where: { id },
            include: {
                movieGenres: {
                    include: {
                        genre: {
                            select: { id: true, name: true, description: true }
                        }
                    }
                }
            }
        });

        if (!movie) {
            return null;
        }

        return formatMovie(movie);
    });
};

const createMovie = async (title, description, poster_url, duration, language, release_date) => {

    const movie = await prisma.movie.create({
        data: {
            title,
            description,
            posterUrl: poster_url,
            duration,
            language,
            releaseDate: release_date
        }
    });

    // Naya movie add hua → movie cache ab stale hai, invalidate karo
    await cache.delByPrefix("movies:");

    return movie;
};

const updateMovie = async (id, title, description, poster_url, duration, language, release_date) => {
    id = Number(id);

    const existing = await prisma.movie.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Movie not found");
    }

    const movie = await prisma.movie.update({
        where: { id },
        data: {
            title,
            description,
            posterUrl: poster_url,
            duration,
            language,
            releaseDate: release_date
        }
    });

    // Movie update hua → cache stale, invalidate karo
    await cache.delByPrefix("movies:");

    return movie;
};

const deleteMovie = async (id) => {
    id = Number(id);

    const existing = await prisma.movie.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Movie not found");
    }

    const movie = await prisma.movie.delete({
        where: { id }
    });

    // Movie delete hua → cache stale, invalidate karo
    await cache.delByPrefix("movies:");

    return movie;
};

module.exports = {
    getAllMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
};
