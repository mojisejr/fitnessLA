import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    }),
});

async function main() {
    const seedUsers = [
        {
            id: "user-owner-dev",
            name: "Lalin Charoen",
            email: "owner@fitnessla.local",
            username: "owner",
            role: "OWNER",
        },
        {
            id: "user-admin-dev",
            name: "Niran Ops Lead",
            email: "admin@fitnessla.local",
            username: "admin",
            role: "ADMIN",
        },
        {
            id: "user-cashier-dev",
            name: "Pim Counter",
            email: "cashier@fitnessla.local",
            username: "cashier",
            role: "CASHIER",
        },
    ];

    for (const user of seedUsers) {
        await prisma.user.upsert({
            where: { username: user.username },
            update: {
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: true,
                emailVerified: true,
            },
            create: {
                ...user,
                emailVerified: true,
                isActive: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    const seedAccounts = [
        {
            code: "1010",
            name: "Cash on Hand",
            type: "ASSET",
            normalBalance: "DEBIT",
        },
        {
            code: "4010",
            name: "Service Revenue",
            type: "REVENUE",
            normalBalance: "CREDIT",
        },
        {
            code: "5010",
            name: "Operating Expense",
            type: "EXPENSE",
            normalBalance: "DEBIT",
        },
        {
            code: "3010",
            name: "Shift Equity",
            type: "EQUITY",
            normalBalance: "CREDIT",
        },
    ];

    for (const account of seedAccounts) {
        await prisma.chartOfAccount.upsert({
            where: { code: account.code },
            update: {
                name: account.name,
                type: account.type,
                normalBalance: account.normalBalance,
            },
            create: account,
        });
    }

    const seedProducts = [
        {
            sku: "PT-001",
            name: "Personal Training Session",
            price: "1500.00",
            productType: "SERVICE",
        },
        {
            sku: "MEM-001",
            name: "Monthly Membership",
            price: "1200.00",
            productType: "MEMBERSHIP",
        },
        {
            sku: "SNK-001",
            name: "Protein Snack",
            price: "85.00",
            productType: "GOODS",
        },
    ];

    for (const product of seedProducts) {
        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {
                name: product.name,
                price: product.price,
                productType: product.productType,
                isActive: true,
            },
            create: {
                ...product,
                isActive: true,
            },
        });
    }

    // --- Trainer Seeds ---
    const seedTrainers = [
        { trainerCode: "TR001", fullName: "สมชาย ยิมเนส", nickname: "ชาย", phone: "081-111-0001" },
        { trainerCode: "TR002", fullName: "พิมพ์พร ฟิตเนส", nickname: "พิมพ์", phone: "081-111-0002" },
        { trainerCode: "TR003", fullName: "ธนกร เทรนเนอร์", nickname: "กร", phone: "081-111-0003" },
        { trainerCode: "TR004", fullName: "อนุชา บอดี้", nickname: "ชา", phone: "081-111-0004" },
        { trainerCode: "TR005", fullName: "นภัส สปอร์ต", nickname: "ภัส", phone: "081-111-0005" },
    ];

    for (const trainer of seedTrainers) {
        await prisma.trainer.upsert({
            where: { trainerCode: trainer.trainerCode },
            update: {
                fullName: trainer.fullName,
                nickname: trainer.nickname,
                phone: trainer.phone,
                isActive: true,
            },
            create: {
                ...trainer,
                isActive: true,
            },
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
