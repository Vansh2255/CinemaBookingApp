const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Admin password ko bcrypt se hash karte hain
    // (pehle schema.sql mein plaintext 'admin123' tha — ye security bug tha)
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Admin user — upsert use karte hain taaki dobara run karne pe duplicate na bane
    const admin = await prisma.user.upsert({
        where: { email: 'admin@movie.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@movie.com',
            password: hashedPassword,
            role: 'admin',
        },
    });

    console.log('✅ Admin user ready:', admin.email);

    // 4 genres
    const genreNames = ['Action', 'Comedy', 'Horror', 'Romance'];

    for (const name of genreNames) {
        await prisma.genre.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log('✅ Genres ready:', genreNames.join(', '));
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
