const userService = require('./user.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../errors/ApiError');

const getProfile = asyncHandler(async (req, res) => {

    const user = await userService.getProfile(req.user.id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    return res.status(200).json({
        success: true,
        user
    });

});

const updateProfile = asyncHandler(async (req, res) => {

    const { name, email } = req.body;

    const user = await userService.updateProfile(
        req.user.id,
        name,
        email
    );

    return res.status(200).json({
        success: true,
        user
    });

});

module.exports = {
    getProfile,
    updateProfile
};