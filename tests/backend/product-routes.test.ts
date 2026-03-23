import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as productsGET, POST as productsPOST } from "../../src/app/api/v1/products/route";
import { PATCH as productsPATCH } from "../../src/app/api/v1/products/[productId]/route";
import { GET as ingredientsGET, POST as ingredientsPOST } from "../../src/app/api/v1/ingredients/route";
import { PATCH as ingredientPATCH } from "../../src/app/api/v1/ingredients/[ingredientId]/route";
import { GET as productRecipeGET, PATCH as productRecipePATCH } from "../../src/app/api/v1/products/[productId]/recipe/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListProducts = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockListIngredients = vi.fn();
const mockCreateIngredient = vi.fn();
const mockUpdateIngredient = vi.fn();
const mockGetProductRecipe = vi.fn();
const mockReplaceProductRecipe = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  listIngredients: (...args: unknown[]) => mockListIngredients(...args),
  createIngredient: (...args: unknown[]) => mockCreateIngredient(...args),
  updateIngredient: (...args: unknown[]) => mockUpdateIngredient(...args),
  getProductRecipe: (...args: unknown[]) => mockGetProductRecipe(...args),
  replaceProductRecipe: (...args: unknown[]) => mockReplaceProductRecipe(...args),
}));

describe("phase2 product routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with product list", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListProducts.mockResolvedValue([
      {
        product_id: "p1",
        sku: "MEM-001",
        name: "Monthly Membership",
        price: 1500,
        product_type: "MEMBERSHIP",
        revenue_account_id: "coa-4101",
      },
    ]);

    const response = await productsGET(new Request("http://localhost/api/v1/products"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0]).toMatchObject({
      product_id: "p1",
      revenue_account_id: "coa-4101",
    });
  });

  it("returns JSON 500 when product list loading fails", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListProducts.mockRejectedValue(new Error("db offline"));

    const response = await productsGET(new Request("http://localhost/api/v1/products"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถโหลดรายการสินค้าได้",
    });
  });

  it("returns 201 for admin product create", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockCreateProduct.mockResolvedValue({
      product_id: "p2",
      sku: "PT-001",
      name: "PT Session",
      tagline: "ขายดีช่วงเย็น",
      price: 1200,
      product_type: "SERVICE",
      pos_category: "TRAINING",
      featured_slot: 2,
      revenue_account_id: "coa-4102",
    });

    const response = await productsPOST(
      new Request("http://localhost/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session",
          tagline: "ขายดีช่วงเย็น",
          price: 1200,
          product_type: "SERVICE",
          pos_category: "TRAINING",
          featured_slot: 2,
          revenue_account_id: "coa-4102",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      product_id: "p2",
      tagline: "ขายดีช่วงเย็น",
      pos_category: "TRAINING",
      featured_slot: 2,
      revenue_account_id: "coa-4102",
    });
    expect(mockCreateProduct).toHaveBeenCalledWith(expect.objectContaining({
      tagline: "ขายดีช่วงเย็น",
      pos_category: "TRAINING",
      featured_slot: 2,
    }));
  });

  it("returns 201 for cashier product create", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });
    mockCreateProduct.mockResolvedValue({
      product_id: "p3",
      sku: "SNACK-001",
      name: "Protein Bar",
      price: 95,
      product_type: "GOODS",
      pos_category: "FOOD",
      stock_on_hand: 12,
      track_stock: true,
    });

    const response = await productsPOST(
      new Request("http://localhost/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "SNACK-001",
          name: "Protein Bar",
          price: 95,
          product_type: "GOODS",
          pos_category: "FOOD",
          stock_on_hand: 12,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      product_id: "p3",
      sku: "SNACK-001",
      pos_category: "FOOD",
    });
  });

  it("returns 200 for admin product update", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateProduct.mockResolvedValue({
      product_id: "p2",
      sku: "PT-001",
      name: "PT Session Plus",
      tagline: "แนะนำโดยพนักงานหน้าเคาน์เตอร์",
      price: 1500,
      product_type: "SERVICE",
      pos_category: "TRAINING",
      featured_slot: 1,
      revenue_account_id: "coa-4103",
    });

    const response = await productsPATCH(
      new Request("http://localhost/api/v1/products/p2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session Plus",
          tagline: "แนะนำโดยพนักงานหน้าเคาน์เตอร์",
          price: 1500,
          pos_category: "TRAINING",
          featured_slot: 1,
          revenue_account_id: "coa-4103",
        }),
      }),
      {
        params: Promise.resolve({ productId: "p2" }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      product_id: "p2",
      name: "PT Session Plus",
      tagline: "แนะนำโดยพนักงานหน้าเคาน์เตอร์",
      pos_category: "TRAINING",
      featured_slot: 1,
      revenue_account_id: "coa-4103",
    });
    expect(mockUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({
      product_id: "p2",
      tagline: "แนะนำโดยพนักงานหน้าเคาน์เตอร์",
      pos_category: "TRAINING",
      featured_slot: 1,
    }));
  });

  it("returns 409 when product update hits duplicate sku", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateProduct.mockRejectedValue({
      code: "P2002",
      clientVersion: "test",
      name: "PrismaClientKnownRequestError",
    });

    const response = await productsPATCH(
      new Request("http://localhost/api/v1/products/p2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session Plus",
          price: 1500,
        }),
      }),
      {
        params: Promise.resolve({ productId: "p2" }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("DUPLICATE_PRODUCT_SKU");
  });

  it("returns 200 with ingredient list", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockListIngredients.mockResolvedValue([
      {
        ingredient_id: "ing-1",
        name: "เมล็ดกาแฟคั่วเข้ม",
        unit: "G",
        purchase_quantity: 1000,
        purchase_price: 690,
        cost_per_unit: 0.69,
        is_active: true,
      },
    ]);

    const response = await ingredientsGET(new Request("http://localhost/api/v1/ingredients"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0]).toMatchObject({ ingredient_id: "ing-1", unit: "G" });
  });

  it("returns 201 for ingredient create", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockCreateIngredient.mockResolvedValue({
      ingredient_id: "ing-2",
      name: "มัทฉะ",
      unit: "G",
      purchase_quantity: 500,
      purchase_price: 450,
      cost_per_unit: 0.9,
      is_active: true,
    });

    const response = await ingredientsPOST(new Request("http://localhost/api/v1/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "มัทฉะ",
        unit: "G",
        purchase_quantity: 500,
        purchase_price: 450,
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ingredient_id: "ing-2", name: "มัทฉะ" });
  });

  it("returns 200 for ingredient patch", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateIngredient.mockResolvedValue({
      ingredient_id: "ing-2",
      name: "มัทฉะพรีเมียม",
      unit: "G",
      purchase_quantity: 500,
      purchase_price: 520,
      cost_per_unit: 1.04,
      is_active: true,
    });

    const response = await ingredientPATCH(new Request("http://localhost/api/v1/ingredients/ing-2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "มัทฉะพรีเมียม",
        unit: "G",
        purchase_quantity: 500,
        purchase_price: 520,
      }),
    }), { params: Promise.resolve({ ingredientId: "ing-2" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("มัทฉะพรีเมียม");
  });

  it("returns 200 with product recipe", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockGetProductRecipe.mockResolvedValue({
      product_id: "prod-1",
      product_name: "Iced Americano",
      items: [
        {
          recipe_item_id: "recipe-1",
          product_id: "prod-1",
          ingredient_id: "ing-1",
          ingredient_name: "เมล็ดกาแฟคั่วเข้ม",
          ingredient_unit: "G",
          quantity: 20,
          ingredient_cost_per_unit: 0.69,
          line_cost: 13.8,
        },
      ],
      total_cost: 13.8,
    });

    const response = await productRecipeGET(new Request("http://localhost/api/v1/products/prod-1/recipe"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total_cost).toBe(13.8);
  });

  it("returns 200 when replacing product recipe", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockReplaceProductRecipe.mockResolvedValue({
      product_id: "prod-1",
      product_name: "Iced Americano",
      items: [],
      total_cost: 0,
    });

    const response = await productRecipePATCH(new Request("http://localhost/api/v1/products/prod-1/recipe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { ingredient_id: "ing-1", quantity: 20 },
        ],
      }),
    }), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ product_id: "prod-1" });
    expect(mockReplaceProductRecipe).toHaveBeenCalledWith({
      product_id: "prod-1",
      items: [{ ingredient_id: "ing-1", quantity: 20 }],
    });
  });
});
