CREATE TABLE "pos_categories" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_categories_pkey" PRIMARY KEY ("code")
);

CREATE UNIQUE INDEX "pos_categories_displayOrder_key" ON "pos_categories"("displayOrder");

INSERT INTO "pos_categories" ("code", "label", "description", "displayOrder", "isActive", "updatedAt")
VALUES
    ('COFFEE', 'กาแฟและเครื่องดื่ม', 'เครื่องดื่ม กาแฟ น้ำดื่ม และของเติมแต่งเครื่องดื่ม', 1, true, CURRENT_TIMESTAMP),
    ('MEMBERSHIP', 'สมาชิก', 'สมาชิก รายวัน ซาวน่า และบริการใช้สถานที่', 2, true, CURRENT_TIMESTAMP),
    ('FOOD', 'อาหารตามสั่ง', 'อาหารจานเดียวและรายการอาหารเสริม', 3, true, CURRENT_TIMESTAMP),
    ('TRAINING', 'บริการเทรน', 'คอร์สเทรนและบริการ personal training', 4, true, CURRENT_TIMESTAMP),
    ('COUNTER', 'สินค้าเสริมหน้าเคาน์เตอร์', 'สินค้าและบริการหน้าเคาน์เตอร์ที่ไม่เข้า 4 หมวดหลัก', 5, true, CURRENT_TIMESTAMP);