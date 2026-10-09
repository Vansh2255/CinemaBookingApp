const screensService = require('./screens.service');
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../errors/ApiError");

const getAllScreens = asyncHandler(async (req, res) => {

    const {
        page = 1,
        limit = 10,
        search = '',
        sort = 'id'
    } = req.query;

    const normalizedPage = Number(page);
    const normalizedLimit = Number(limit);
    if (!Number.isInteger(normalizedPage) || normalizedPage < 1) {
        throw new ApiError(400, "Page must be a positive integer");
    }
    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 100) {
        throw new ApiError(400, "Limit must be between 1 and 100");
    }

    const result = await screensService.getAllScreens(
        normalizedPage,
        normalizedLimit,
        search,
        sort
    );

    return res.status(200).json({
        success: true,
        page: normalizedPage,
        limit: normalizedLimit,
        count: result.screens.length,
        totalRecords: result.totalRecords,
        totalPages: Math.ceil(result.totalRecords / normalizedLimit),
        screens: result.screens
    });

});

const getScreenById = asyncHandler(async (req, res) => {

    const screen =
        await screensService.getScreenById(req.params.id);

    if (!screen) {
        throw new ApiError(404, "Screen not found");
    }

    return res.status(200).json({
        success: true,
        screen
    });

});

const createScreen = asyncHandler(async (req, res) => {

    const {
        theatre_id,
        name,
        capacity,
        screen_type
    } = req.body;

    const screen =
        await screensService.createScreen(
            theatre_id,
            name,
            capacity,
            screen_type
        );

    return res.status(201).json({
        success: true,
        screen
    });

});

const updateScreen = asyncHandler(async (req, res) => {

    const {
        theatre_id,
        name,
        capacity,
        screen_type
    } = req.body;

    const screen =
        await screensService.updateScreen(
            req.params.id,
            theatre_id,
            name,
            capacity,
            screen_type
        );

    return res.status(200).json({
        success: true,
        screen
    });

});

const deleteScreen = asyncHandler(async (req, res) => {

    const screen =
        await screensService.deleteScreen(req.params.id);

    return res.status(200).json({
        success: true,
        message: "Screen deleted successfully",
        screen
    });

});

module.exports = {
    getAllScreens,
    getScreenById,
    createScreen,
    updateScreen,
    deleteScreen
};
