import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

function toIsoStamp(value = new Date()) {
    return value.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

async function main() {
    const rows = await prisma.product.findMany({
        orderBy: [{ sku: "asc" }],
        include: {
            revenueAccount: {
                select: {
                    code: true,
                    name: true,
                },
            },
        },
    });

    const backupDir = path.join(process.cwd(), "backups", "pos-preserve-2026-03-21", "db-backups");
    await mkdir(backupDir, { recursive: true });

    const filePath = path.join(backupDir, `products-pre-sync-${toIsoStamp()}.json`);
    const payload = {
        exportedAt: new Date().toISOString(),
        rowCount: rows.length,
        products: rows.map((row) => ({
            id: row.id,
            sku: row.sku,
            name: row.name,
            price: Number(row.price),
            productType: row.productType,
            isActive: row.isActive,
            trackStock: row.trackStock,
            stockOnHand: row.stockOnHand,
            membershipPeriod: row.membershipPeriod,
            membershipDurationDays: row.membershipDurationDays,
            revenueAccountId: row.revenueAccountId,
            revenueAccountCode: row.revenueAccount?.code ?? null,
            revenueAccountName: row.revenueAccount?.name ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        })),
    };

    await writeFile(filePath, JSON.stringify(payload, null, 2));
    console.log(`Backed up ${rows.length} products to ${filePath}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("POS product backup failed:", error);
        await prisma.$disconnect();
        process.exit(1);
    });
