import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import posCatalog from "../src/lib/pos-catalog.json" with { type: "json" };

const legacyPosFixups = [
    {
        sku: "MEM-001",
        name: "Monthly Membership",
        price: 1500,
        productType: "MEMBERSHIP",
        revenueCode: "4020",
        membershipPeriod: "MONTHLY",
        membershipDurationDays: 30,
    },
    {
        sku: "PT-001",
        name: "Personal Training Session",
        price: 1500,
        productType: "SERVICE",
        revenueCode: "4010",
    },
    {
        sku: "SNK-001",
        name: "Protein Snack",
        price: 85,
        productType: "GOODS",
        revenueCode: "4010",
    },
];

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL หรือ DIRECT_URL ยังไม่ถูกตั้งค่า");
    process.exit(1);
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

const normalizedCatalog = [...legacyPosFixups, ...posCatalog];

async function main() {
    const revenueAccounts = await prisma.chartOfAccount.findMany({
        where: { code: { in: ["4010", "4020"] } },
        select: {
            id: true,
            code: true,
        },
    });

    const revenueCodeById = new Map(revenueAccounts.map((account) => [account.id, account.code]));
    const expectedBySku = new Map(normalizedCatalog.map((product) => [product.sku, product]));
    const dbRows = await prisma.product.findMany({
        where: { sku: { in: normalizedCatalog.map((product) => product.sku) } },
        orderBy: { sku: "asc" },
        select: {
            sku: true,
            name: true,
            price: true,
            productType: true,
            isActive: true,
            revenueAccountId: true,
            membershipPeriod: true,
            membershipDurationDays: true,
        },
    });

    const dbBySku = new Map(dbRows.map((row) => [row.sku, row]));
    const missingSkus = normalizedCatalog.filter((product) => !dbBySku.has(product.sku)).map((product) => product.sku);
    const mismatches = normalizedCatalog.flatMap((expectedProduct) => {
        const actualProduct = dbBySku.get(expectedProduct.sku);
        if (!actualProduct) {
            return [];
        }

        const fieldDiffs = [];

        if (actualProduct.name !== expectedProduct.name) {
            fieldDiffs.push({ field: "name", expected: expectedProduct.name, actual: actualProduct.name });
        }

        if (Number(actualProduct.price) !== expectedProduct.price) {
            fieldDiffs.push({ field: "price", expected: expectedProduct.price, actual: Number(actualProduct.price) });
        }

        if (actualProduct.productType !== expectedProduct.productType) {
            fieldDiffs.push({ field: "productType", expected: expectedProduct.productType, actual: actualProduct.productType });
        }

        const actualRevenueCode = actualProduct.revenueAccountId ? revenueCodeById.get(actualProduct.revenueAccountId) ?? null : null;
        if (actualRevenueCode !== expectedProduct.revenueCode) {
            fieldDiffs.push({ field: "revenueCode", expected: expectedProduct.revenueCode, actual: actualRevenueCode });
        }

        const expectedMembershipPeriod = expectedProduct.membershipPeriod ?? null;
        if ((actualProduct.membershipPeriod ?? null) !== expectedMembershipPeriod) {
            fieldDiffs.push({ field: "membershipPeriod", expected: expectedMembershipPeriod, actual: actualProduct.membershipPeriod ?? null });
        }

        const expectedMembershipDurationDays = expectedProduct.membershipDurationDays ?? null;
        if ((actualProduct.membershipDurationDays ?? null) !== expectedMembershipDurationDays) {
            fieldDiffs.push({
                field: "membershipDurationDays",
                expected: expectedMembershipDurationDays,
                actual: actualProduct.membershipDurationDays ?? null,
            });
        }

        if (!actualProduct.isActive) {
            fieldDiffs.push({ field: "isActive", expected: true, actual: false });
        }

        if (fieldDiffs.length === 0) {
            return [];
        }

        return [{ sku: expectedProduct.sku, diffs: fieldDiffs }];
    });

    const customActiveProducts = await prisma.product.findMany({
        where: {
            isActive: true,
            sku: { notIn: normalizedCatalog.map((product) => product.sku) },
        },
        orderBy: { sku: "asc" },
        select: {
            sku: true,
            name: true,
            productType: true,
            price: true,
        },
    });

    const totalProducts = await prisma.product.count();
    const summary = {
        totalProducts,
        catalogProductsChecked: normalizedCatalog.length,
        missingSkus,
        mismatches,
        customActiveProducts: customActiveProducts.map((product) => ({
            ...product,
            price: Number(product.price),
        })),
    };

    console.log(JSON.stringify(summary, null, 2));

    if (missingSkus.length > 0 || mismatches.length > 0) {
        process.exitCode = 1;
    }
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
