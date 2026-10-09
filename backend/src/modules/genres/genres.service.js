const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");

const createGenre = async (genreData) => {
    const { name, description } = genreData;

    // Case-insensitive duplicate check — mode: 'insensitive' (PostgreSQL ILIKE jaise)
    const existing = await prisma.genre.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
        throw new ApiError(409, "Genre already exists");
    }

    const genre = await prisma.genre.create({
        data: { name, description }
    });

    return genre;
};

const getAllGenres = async () => {
    const genres = await prisma.genre.findMany({
        orderBy: { id: 'asc' }
    });

    return genres;
};

const getGenreById = async (id) => {
    id = Number(id);

    const genre = await prisma.genre.findUnique({
        where: { id }
    });

    return genre;
};

const updateGenre = async (id, genreData) => {
    id = Number(id);

    const { name, description } = genreData;

    // Duplicate check excluding self (id: { not: id })
    const duplicate = await prisma.genre.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
            id: { not: id }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Genre already exists");
    }

    const genre = await prisma.genre.update({
        where: { id },
        data: { name, description }
    });

    return genre;
};

const deleteGenre = async (id) => {
    id = Number(id);

    const genre = await prisma.genre.delete({
        where: { id }
    });

    return genre;
};

module.exports = {
    createGenre,
    getAllGenres,
    getGenreById,
    updateGenre,
    deleteGenre
};
