import { prisma } from "./prismaClient.js";

afterAll(async () => {
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));
});