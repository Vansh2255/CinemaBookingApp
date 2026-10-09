const path = require("path");
const { execSync } = require("child_process");

// .env → DB credentials (DB_HOST, DB_USER, etc.)
// .env.test → test DATABASE_URL (override: true se ye .env ko override karega)
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.test"), override: true });

const { Client } = require("pg");

const TEST_DB_NAME = "movie_reservation_test";

module.exports = async () => {
    // 1. Test DB create karo (agar already nahi hai)
    //    "postgres" maintenance DB se connect karke check/create karte hain
    const admin = new Client({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: "postgres"
    });

    await admin.connect();

    // 1. Test DB ko har baar fresh recreate karte hain (drop + create).
    //    Reason: schema badalne par (naye columns/models) purane data se
    //    `db push` fail ho jata hai — "required column + existing rows".
    //    Test DB disposable hai, isliye drop karna safe hai.
    //    WITH (FORCE) se pehle run ke leftover connections bhi terminate ho jate hain.
    //    (Ye raw SQL hai, Prisma ka --force-reset nahi, isliye AI guard trigger nahi hota.)
    await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`✅ Recreated test database: ${TEST_DB_NAME}`);

    await admin.end();

    // 2. Schema ko fresh test DB mein sync karo
    //    Data cleanup beforeAll ke clearDatabase() se hota hai
    execSync("npx prisma db push --skip-generate", {
        env: { ...process.env },
        stdio: "inherit",
        cwd: path.resolve(__dirname, "..")
    });

    console.log("✅ Test database schema synced");
};
