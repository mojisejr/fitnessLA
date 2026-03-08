import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

async function main() {
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
