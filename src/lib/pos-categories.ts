import type { PosSalesCategory, Product, SalesByCategoryRow } from "@/lib/contracts";

export type PosCategoryDefinition = {
  category: PosSalesCategory;
  label: string;
  description: string;
  display_order: number;
};

export const POS_CATEGORY_DEFINITIONS: PosCategoryDefinition[] = [
  {
    category: "COFFEE",
    label: "กาแฟและเครื่องดื่ม",
    description: "เครื่องดื่ม กาแฟ น้ำดื่ม และของเติมแต่งเครื่องดื่ม",
    display_order: 1,
  },
  {
    category: "MEMBERSHIP",
    label: "สมาชิก",
    description: "สมาชิก รายวัน ซาวน่า และบริการใช้สถานที่",
    display_order: 2,
  },
  {
    category: "FOOD",
    label: "อาหารตามสั่ง",
    description: "อาหารจานเดียวและรายการอาหารเสริม",
    display_order: 3,
  },
  {
    category: "TRAINING",
    label: "บริการเทรน",
    description: "คอร์สเทรนและบริการ personal training",
    display_order: 4,
  },
  {
    category: "COUNTER",
    label: "สินค้าเสริมหน้าเคาน์เตอร์",
    description: "สินค้าและบริการหน้าเคาน์เตอร์ที่ไม่เข้า 4 หมวดหลัก",
    display_order: 5,
  },
];

export const POS_CATEGORY_LABEL: Record<PosSalesCategory, string> = {
  COFFEE: "กาแฟและเครื่องดื่ม",
  MEMBERSHIP: "สมาชิก",
  FOOD: "อาหารตามสั่ง",
  TRAINING: "บริการเทรน",
  COUNTER: "สินค้าเสริมหน้าเคาน์เตอร์",
};

export function isPosSalesCategory(value: string | null | undefined): value is PosSalesCategory {
  return value === "COFFEE" || value === "MEMBERSHIP" || value === "FOOD" || value === "TRAINING" || value === "COUNTER";
}

export function getPosSalesCategoryFromSku(sku: string): PosSalesCategory {
  if (sku.startsWith("COFFEE-") || sku.startsWith("SHAKE-") || sku.startsWith("WATER-")) {
    return "COFFEE";
  }

  if (sku.startsWith("FOOD-")) {
    return "FOOD";
  }

  if (sku.startsWith("PT-")) {
    return "TRAINING";
  }

  if (sku.startsWith("MEM-") || sku === "DAYPASS" || sku.startsWith("SAUNA-")) {
    return "MEMBERSHIP";
  }

  return "COUNTER";
}

export function getPosSalesCategoryFromProduct(product: Pick<Product, "sku" | "product_type"> & { pos_category?: PosSalesCategory | null }): PosSalesCategory {
  if (isPosSalesCategory(product.pos_category)) {
    return product.pos_category;
  }

  if (product.product_type === "MEMBERSHIP") {
    return "MEMBERSHIP";
  }

  return getPosSalesCategoryFromSku(product.sku);
}

export function buildEmptyPosSalesCategoryRows(): SalesByCategoryRow[] {
  return POS_CATEGORY_DEFINITIONS.map((definition) => ({
    category: definition.category,
    label: definition.label,
    total_amount: 0,
    receipt_count: 0,
    item_count: 0,
  }));
}