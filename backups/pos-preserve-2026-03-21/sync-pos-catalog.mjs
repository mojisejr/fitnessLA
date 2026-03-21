import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import posCatalog from "../src/lib/pos-catalog.json" with { type: "json" };

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL หรือ DIRECT_URL ยังไม่ถูกตั้งค่า");
    process.exit(1);
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

async function main() {
    const revenueAccounts = await prisma.chartOfAccount.findMany({
        where: { code: { in: ["4010", "4020"] } },
        select: { id: true, code: true },
    });

    const revenueAccountIdByCode = new Map(revenueAccounts.map((account) => [account.code, account.id]));

    let syncedCount = 0;

    for (const product of posCatalog) {
        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {
                name: product.name,
                price: product.price,
                productType: product.productType,
                isActive: true,
                revenueAccountId: revenueAccountIdByCode.get(product.revenueCode) ?? null,
            },
            create: {
                sku: product.sku,
                name: product.name,
                price: product.price,
                productType: product.productType,
                isActive: true,
                revenueAccountId: revenueAccountIdByCode.get(product.revenueCode) ?? null,
            },
        });

        syncedCount += 1;
    }

    console.log(`Synced POS catalog successfully: ${syncedCount} items`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("POS catalog sync failed:", error);
        await prisma.$disconnect();
        process.exit(1);
    });
