const prisma = require("../../config/prisma");
const ApiError = require("../../errors/ApiError");
const cache = require("../../utils/cache");

const getAllTheatres = async (page, limit, search, sort) => {

    // Cache key mein query params include karte hain (filters alag data dete hain)
    const cacheKey = `theatres:list:${page}:${limit}:${search}:${sort}`;

    return cache.getOrSet(cacheKey, 60, async () => {
        const offset = (page - 1) * limit;

        const allowedSortFields = ["id", "name", "location", "createdAt"];

        let orderBy = { id: 'asc' };

        if (sort) {
            const direction = sort.startsWith("-") ? "desc" : "asc";
            const field = sort.replace("-", "");

            if (allowedSortFields.includes(field)) {
                orderBy = { [field]: direction };
            }
        }

        // Search name ya location dono pe (OR condition)
        const where = {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } }
            ]
        };

        const total = await prisma.theatre.count({ where });

        const theatres = await prisma.theatre.findMany({
            where,
            orderBy,
            skip: offset,
            take: limit
        });

        return {
            total,
            theatres
        };
    });

};

const getTheatreById = async (id) => {
    id = Number(id);

    const theatre = await prisma.theatre.findUnique({
        where: { id }
    });

    return theatre;
};

const createTheatre = async (name, location) => {

    const existing = await prisma.theatre.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
        throw new ApiError(409, "Theatre already exists");
    }

    const theatre = await prisma.theatre.create({
        data: { name, location }
    });

    // Naya theatre add hua → theatre cache stale, invalidate karo
    await cache.delByPrefix("theatres:");

    return theatre;
};

const updateTheatre = async (id, name, location) => {
    id = Number(id);

    const existing = await prisma.theatre.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Theatre not found");
    }

    name = name ?? existing.name;
    location = location ?? existing.location;

    const duplicate = await prisma.theatre.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
            id: { not: id }
        }
    });

    if (duplicate) {
        throw new ApiError(409, "Theatre already exists");
    }

    const theatre = await prisma.theatre.update({
        where: { id },
        data: { name, location }
    });

    // Theatre update hua → cache stale, invalidate karo
    await cache.delByPrefix("theatres:");

    return theatre;
};

const deleteTheatre = async (id) => {
    id = Number(id);

    const existing = await prisma.theatre.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new ApiError(404, "Theatre not found");
    }

    const theatre = await prisma.theatre.delete({
        where: { id }
    });

    // Theatre delete hua → cache stale, invalidate karo
    await cache.delByPrefix("theatres:");

    return theatre;
};

module.exports = {
    getAllTheatres,
    getTheatreById,
    createTheatre,
    updateTheatre,
    deleteTheatre
};
