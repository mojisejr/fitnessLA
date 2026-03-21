import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient, Prisma } = prismaPkg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL หรือ DIRECT_URL ยังไม่ถูกตั้งค่า");
    process.exit(1);
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
});

const SAMPLE_MONTHLY_MEMBER_CODE = "MBR-SAMPLE-MONTHLY";
const SAMPLE_TRAINING_MEMBER_CODE = "MBR-SAMPLE-TRAINING";
const SAMPLE_TRAINER_CODE = "TR900";
const SAMPLE_ORDER_NUMBER = "SAMPLE-TRN-001";

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function inferSessionLimitFromSku(sku) {
    const matched = sku.match(/PT-(\d+)/);
    return matched ? Number(matched[1]) : null;
}

async function findMembershipProduct() {
    const preferredWhere = {
        productType: "MEMBERSHIP",
        isActive: true,
        OR: [
            { sku: { in: ["MEM-MONTH", "MEM-001"] } },
            { name: { contains: "1 เดือน" } },
            { name: { contains: "Monthly" } },
            { name: { contains: "รายเดือน" } },
        ],
    };

    const preferred = await prisma.product.findFirst({
        where: preferredWhere,
        orderBy: { createdAt: "asc" },
    });

    if (preferred) {
        return preferred;
    }

    return prisma.product.findFirst({
        where: {
            productType: "MEMBERSHIP",
            isActive: true,
        },
        orderBy: [
            { sku: "asc" },
            { createdAt: "asc" },
        ],
    });
}

async function findTrainingProduct() {
    const preferredSkus = ["PT-10", "PT-MONTH", "PT-001", "PT-01"];

    for (const sku of preferredSkus) {
        const product = await prisma.product.findUnique({ where: { sku } });
        if (product?.isActive) {
            return product;
        }
    }

    return prisma.product.findFirst({
        where: {
            sku: { startsWith: "PT-" },
            isActive: true,
        },
        orderBy: { createdAt: "asc" },
    });
}

async function ensureSampleMonthlyMember(membershipProduct) {
    const existingMonthlyWithoutTrainer = await prisma.memberSubscription.findFirst({
        where: {
            membershipProduct: {
                productType: "MEMBERSHIP",
            },
            trainingEnrollments: {
                none: {},
            },
        },
        select: {
            memberCode: true,
            fullName: true,
        },
    });

    if (existingMonthlyWithoutTrainer) {
        return {
            action: "existing",
            memberCode: existingMonthlyWithoutTrainer.memberCode,
            fullName: existingMonthlyWithoutTrainer.fullName,
        };
    }

    const startedAt = new Date("2026-03-21T09:00:00.000Z");
    const expiresAt = addDays(startedAt, 30);

    const member = await prisma.memberSubscription.upsert({
        where: { memberCode: SAMPLE_MONTHLY_MEMBER_CODE },
        update: {
            fullName: "Monthly Sample Member",
            phone: "081-900-0001",
            membershipProductId: membershipProduct.id,
            startedAt,
            expiresAt,
            renewalStatus: "ACTIVE",
            renewalMethod: "NONE",
        },
        create: {
            memberCode: SAMPLE_MONTHLY_MEMBER_CODE,
            fullName: "Monthly Sample Member",
            phone: "081-900-0001",
            membershipProductId: membershipProduct.id,
            startedAt,
            expiresAt,
            renewalStatus: "ACTIVE",
            renewalMethod: "NONE",
        },
    });

    return {
        action: "created",
        memberCode: member.memberCode,
        fullName: member.fullName,
    };
}

async function ensureTrainer() {
    const existingTrainer = await prisma.trainer.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
    });

    if (existingTrainer) {
        return {
            trainer: existingTrainer,
            action: "existing",
        };
    }

    const trainer = await prisma.trainer.upsert({
        where: { trainerCode: SAMPLE_TRAINER_CODE },
        update: {
            fullName: "Sample Trainer",
            nickname: "Coach",
            phone: "081-900-0002",
            isActive: true,
        },
        create: {
            trainerCode: SAMPLE_TRAINER_CODE,
            fullName: "Sample Trainer",
            nickname: "Coach",
            phone: "081-900-0002",
            isActive: true,
        },
    });

    return {
        trainer,
        action: "created",
    };
}

async function ensureLinkedTrainingSample(membershipProduct, trainingProduct, trainer) {
    const startedAt = new Date("2026-03-21T10:00:00.000Z");
    const expiresAt = addDays(startedAt, 30);

    const member = await prisma.memberSubscription.upsert({
        where: { memberCode: SAMPLE_TRAINING_MEMBER_CODE },
        update: {
            fullName: "Training Sample Member",
            phone: "081-900-0003",
            membershipProductId: membershipProduct.id,
            startedAt,
            expiresAt,
            renewalStatus: "ACTIVE",
            renewalMethod: "NONE",
        },
        create: {
            memberCode: SAMPLE_TRAINING_MEMBER_CODE,
            fullName: "Training Sample Member",
            phone: "081-900-0003",
            membershipProductId: membershipProduct.id,
            startedAt,
            expiresAt,
            renewalStatus: "ACTIVE",
            renewalMethod: "NONE",
        },
    });

    const existingLinkedEnrollment = await prisma.trainingServiceEnrollment.findFirst({
        where: {
            memberSubscriptionId: { not: null },
            trainerId: { not: null },
        },
        select: {
            id: true,
            memberSubscription: {
                select: {
                    memberCode: true,
                    fullName: true,
                },
            },
            trainer: {
                select: {
                    trainerCode: true,
                    fullName: true,
                },
            },
            packageProduct: {
                select: {
                    sku: true,
                    name: true,
                },
            },
        },
    });

    if (existingLinkedEnrollment) {
        return {
            action: "existing",
            enrollmentId: existingLinkedEnrollment.id,
            memberCode: existingLinkedEnrollment.memberSubscription?.memberCode ?? null,
            memberName: existingLinkedEnrollment.memberSubscription?.fullName ?? null,
            trainerCode: existingLinkedEnrollment.trainer?.trainerCode ?? null,
            trainerName: existingLinkedEnrollment.trainer?.fullName ?? null,
            packageSku: existingLinkedEnrollment.packageProduct.sku,
            packageName: existingLinkedEnrollment.packageProduct.name,
        };
    }

    let order = await prisma.order.findUnique({
        where: { orderNumber: SAMPLE_ORDER_NUMBER },
        include: {
            items: true,
        },
    });

    if (!order) {
        const seedUser =
            (await prisma.user.findFirst({ where: { username: "cashier" } })) ??
            (await prisma.user.findFirst({ where: { username: "staff" } })) ??
            (await prisma.user.findFirst({ where: { username: "owner" } })) ??
            (await prisma.user.findFirst({ where: { username: "admin" } }));

        if (!seedUser) {
            throw new Error("ไม่พบผู้ใช้สำหรับผูก sample shift/order");
        }

        const shift = await prisma.shift.create({
            data: {
                staffId: seedUser.id,
                responsibleName: "Sample Seeder",
                startTime: new Date("2026-03-21T09:30:00.000Z"),
                endTime: new Date("2026-03-21T10:30:00.000Z"),
                startingCash: new Prisma.Decimal("0.00"),
                expectedCash: new Prisma.Decimal("0.00"),
                actualCash: new Prisma.Decimal("0.00"),
                difference: new Prisma.Decimal("0.00"),
                status: "CLOSED",
            },
        });

        order = await prisma.order.create({
            data: {
                orderNumber: SAMPLE_ORDER_NUMBER,
                shiftId: shift.id,
                paymentMethod: "CASH",
                totalAmount: trainingProduct.price,
                customerName: member.fullName,
                status: "COMPLETED",
                createdAt: new Date("2026-03-21T10:00:00.000Z"),
                items: {
                    create: [
                        {
                            productId: trainingProduct.id,
                            quantity: 1,
                            unitPrice: trainingProduct.price,
                            totalPrice: trainingProduct.price,
                        },
                    ],
                },
            },
            include: {
                items: true,
            },
        });
    }

    const orderItem = order.items[0];
    if (!orderItem) {
        throw new Error("sample order ไม่มี order item สำหรับสร้าง enrollment");
    }

    const enrollment = await prisma.trainingServiceEnrollment.create({
        data: {
            orderId: order.id,
            orderItemId: orderItem.id,
            memberSubscriptionId: member.id,
            trainerId: trainer.id,
            packageProductId: trainingProduct.id,
            customerNameSnapshot: member.fullName,
            packageNameSnapshot: trainingProduct.name,
            packageSkuSnapshot: trainingProduct.sku,
            startedAt,
            expiresAt,
            sessionLimit: inferSessionLimitFromSku(trainingProduct.sku),
            priceSnapshot: trainingProduct.price,
            status: "ACTIVE",
        },
    });

    return {
        action: "created",
        enrollmentId: enrollment.id,
        memberCode: member.memberCode,
        memberName: member.fullName,
        trainerCode: trainer.trainerCode,
        trainerName: trainer.fullName,
        packageSku: trainingProduct.sku,
        packageName: trainingProduct.name,
    };
}

async function main() {
    const membershipProduct = await findMembershipProduct();
    if (!membershipProduct) {
        throw new Error("ไม่พบสินค้า MEMBERSHIP สำหรับสร้างข้อมูลตัวอย่าง");
    }

    const trainingProduct = await findTrainingProduct();
    if (!trainingProduct) {
        throw new Error("ไม่พบสินค้า PT-* สำหรับสร้างข้อมูลตัวอย่าง");
    }

    const monthlyMember = await ensureSampleMonthlyMember(membershipProduct);
    const trainerResult = await ensureTrainer();
    const linkedTraining = await ensureLinkedTrainingSample(membershipProduct, trainingProduct, trainerResult.trainer);

    console.log(
        JSON.stringify(
            {
                membershipProduct: {
                    sku: membershipProduct.sku,
                    name: membershipProduct.name,
                },
                trainingProduct: {
                    sku: trainingProduct.sku,
                    name: trainingProduct.name,
                },
                monthlyMember,
                trainer: {
                    action: trainerResult.action,
                    trainerCode: trainerResult.trainer.trainerCode,
                    fullName: trainerResult.trainer.fullName,
                },
                linkedTraining,
            },
            null,
            2,
        ),
    );
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