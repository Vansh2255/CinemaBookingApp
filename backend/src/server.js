// Entry point: sirf server ko start karta hai.
// app.js Express app banata + export karta hai (taaki tests import kar sakein).
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
});
