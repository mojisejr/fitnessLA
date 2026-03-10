import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaPkg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL หรือ DIRECT_URL ยังไม่ถูกตั้งค่า");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

const devUsers = [
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

async function main() {
  for (const user of devUsers) {
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

  console.log("Upserted dev login users: owner, admin, cashier");
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