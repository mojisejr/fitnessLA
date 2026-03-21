import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL หรือ DIRECT_URL ยังไม่ถูกตั้งค่า");
    process.exit(1);
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

async function main() {
    const sampleRows = await prisma.product.findMany({
        where: {
            sku: {
                in: ["DAYPASS", "MEM-MONTH", "MEM-3MONTH", "SAUNA-01", "COFFEE-25", "FOOD-24"],
            },
        },
        orderBy: { sku: "asc" },
        select: {
            sku: true,
            name: true,
            productType: true,
            isActive: true,
        },
    });

    const totalProducts = await prisma.product.count();

    console.log(JSON.stringify({ totalProducts, sampleRows }, null, 2));
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("POS product verification failed:", error);
        await prisma.$disconnect();
        process.exit(1);
    });
