const { PrismaClient } = require('@prisma/client');

// PrismaClient ka single instance banate hain (singleton pattern)
// — baar baar new instance banane se DB connections ki wastage hoti hai
const prisma = new PrismaClient();

module.exports = prisma;
