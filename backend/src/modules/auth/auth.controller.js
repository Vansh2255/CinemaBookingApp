const authService = require('./auth.service');

const register = async (req, res) => {

    const { name, email, password } = req.body;

    const user = await authService.registerUser(
        name,
        email,
        password
    );

    res.status(201).json({
        success: true,
        user
    });

};

const login = async (req, res) => {
        const { email, password } = req.body;

        const result = await authService.loginUser(
            email,
            password
        );

        res.status(200).json({
            success: true,
            ...result
        });
    }

const refreshToken = async (req, res) => {

        const { refreshToken } = req.body;

        const result = await authService.refreshAccessToken(
            refreshToken
        );

        res.status(200).json({
            success: true,
            ...result
        });

};

const logout = async (req, res) => {
    await authService.logoutUser(req.user.id);

    res.status(200).json({
        success: true,
        message: "Logout successful"
    });
};

const changePassword = async (req, res) => {
    await authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
    );

    res.status(200).json({
        success: true,
        message: "Password changed successfully. Please log in again."
    });
};

const forgotPassword = async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    // Same response for existing/non-existing emails prevents account enumeration.
    res.status(200).json({
        success: true,
        message: "If an account exists for this email, a password reset link has been sent."
    });
};

const resetPassword = async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.status(200).json({
        success: true,
        message: "Password reset successfully. Please log in again."
    });
};

const sendVerificationEmail = async (req, res) => {
    await authService.sendVerificationEmail(req.user.id);
    res.status(200).json({ success: true, message: "Verification email sent" });
};

const verifyEmail = async (req, res) => {
    await authService.verifyEmail(req.body.token);
    res.status(200).json({ success: true, message: "Email verified successfully" });
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    sendVerificationEmail,
    verifyEmail
};
