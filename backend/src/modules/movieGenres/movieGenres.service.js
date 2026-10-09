const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");

const assignGenre = async (movie_id, genre_id) => {
    movie_id = Number(movie_id);
    genre_id = Number(genre_id);

    const movie = await prisma.movie.findUnique({
        where: { id: movie_id }
    });

    if (!movie) {
        throw new ApiError(404, "Movie not found");
    }

    const genre = await prisma.genre.findUnique({
        where: { id: genre_id }
    });

    if (!genre) {
        throw new ApiError(404, "Genre not found");
    }

    const existing = await prisma.movieGenre.findFirst({
        where: {
            movieId: movie_id,
            genreId: genre_id
        }
    });

    if (existing) {
        throw new ApiError(409, "Genre already assigned to this movie");
    }

    const mapping = await prisma.movieGenre.create({
        data: {
            movieId: movie_id,
            genreId: genre_id
        }
    });

    return mapping;
};

const getAllMappings = async () => {

    const mappings = await prisma.movieGenre.findMany({
        include: {
            movie: { select: { id: true, title: true } },
            genre: { select: { id: true, name: true } }
        },
        orderBy: { id: 'asc' }
    });

    return mappings;
};

const getGenresByMovie = async (movie_id) => {
    movie_id = Number(movie_id);

    const mappings = await prisma.movieGenre.findMany({
        where: { movieId: movie_id },
        include: {
            genre: {
                select: { id: true, name: true, description: true }
            }
        }
    });

    // Flat list of genres return karte hain
    return mappings.map(m => m.genre);
};

const removeGenre = async (movie_id, genre_id) => {
    movie_id = Number(movie_id);
    genre_id = Number(genre_id);

    const existing = await prisma.movieGenre.findFirst({
        where: {
            movieId: movie_id,
            genreId: genre_id
        }
    });

    if (!existing) {
        throw new ApiError(404, "Mapping not found");
    }

    const mapping = await prisma.movieGenre.delete({
        where: { id: existing.id }
    });

    return mapping;
};

module.exports = {
    assignGenre,
    getAllMappings,
    getGenresByMovie,
    removeGenre
};
