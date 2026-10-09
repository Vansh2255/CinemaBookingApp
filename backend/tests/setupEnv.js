const path = require("path");

// Har test file load hone se PEHLE env vars set karte hain (Jest "setupFiles")
// - .env      → base values
// - .env.test → override (DATABASE_URL test DB ki taraf, NODE_ENV=test)
// Isse jab app.js / prisma.js load ho, tabhi sahi env milta hai
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.test"), override: true });
