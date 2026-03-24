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

function looksLikeMembershipSku(sku) {
  const normalized = sku.toUpperCase();

  if (normalized.startsWith("PT-")) {
    return false;
  }

  return (
    normalized.includes("MEM") ||
    normalized.includes("MBR") ||
    normalized.includes("DAYPASS") ||
    normalized.includes("MONTH") ||
    normalized.includes("YEAR")
  );
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ posCategoryCode: "asc" }, { sku: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      productType: true,
      posCategoryCode: true,
      membershipPeriod: true,
      membershipDurationDays: true,
      price: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const displayMembershipButWrongType = products.filter((product) => (
    product.posCategoryCode === "MEMBERSHIP" && product.productType !== "MEMBERSHIP"
  ));

  const membershipTypeMissingMetadata = products.filter((product) => (
    product.productType === "MEMBERSHIP"
    && (
      product.posCategoryCode !== "MEMBERSHIP"
      || product.membershipPeriod == null
      || product.membershipDurationDays == null
      || product.membershipDurationDays <= 0
    )
  ));

  const skuSuggestsMembershipButWrongType = products.filter((product) => (
    product.productType !== "MEMBERSHIP" && looksLikeMembershipSku(product.sku)
  ));

  const summary = {
    auditedAt: new Date().toISOString(),
    totals: {
      activeProducts: products.length,
      displayMembershipButWrongType: displayMembershipButWrongType.length,
      membershipTypeMissingMetadata: membershipTypeMissingMetadata.length,
      skuSuggestsMembershipButWrongType: skuSuggestsMembershipButWrongType.length,
    },
    findings: {
      displayMembershipButWrongType: displayMembershipButWrongType.map((product) => ({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        product_type: product.productType,
        pos_category: product.posCategoryCode,
        price: Number(product.price),
        updated_at: product.updatedAt.toISOString(),
      })),
      membershipTypeMissingMetadata: membershipTypeMissingMetadata.map((product) => ({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        product_type: product.productType,
        pos_category: product.posCategoryCode,
        membership_period: product.membershipPeriod,
        membership_duration_days: product.membershipDurationDays,
        updated_at: product.updatedAt.toISOString(),
      })),
      skuSuggestsMembershipButWrongType: skuSuggestsMembershipButWrongType.map((product) => ({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        product_type: product.productType,
        pos_category: product.posCategoryCode,
        membership_period: product.membershipPeriod,
        membership_duration_days: product.membershipDurationDays,
        created_at: product.createdAt.toISOString(),
      })),
    },
    remediation_notes: [
      "รีวิวรายการ displayMembershipButWrongType ก่อน เพราะเป็นเคสที่ผู้ใช้เห็นเป็น membership แต่ backend side effects จะไม่ทำงาน",
      "อย่ารัน production mutation อัตโนมัติจากผลลัพธ์นี้ ให้ใช้เป็นรายงานสำหรับอนุมัติ remediation แยกต่างหาก",
      "ถ้าพบ productType = MEMBERSHIP แต่ metadata ไม่ครบ ให้แก้ผ่าน admin flow หรือ migration ที่มี approval เท่านั้น",
    ],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Membership contract audit failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });