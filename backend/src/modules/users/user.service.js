const prisma = require('../../config/prisma');

const getProfile = async (userId) => {

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });

    return user;

};

const updateProfile = async (userId, name, email) => {

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            email
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });

    return user;

};

module.exports = {
    getProfile,
    updateProfile
};
