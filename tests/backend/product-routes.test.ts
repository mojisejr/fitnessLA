import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as productsGET, POST as productsPOST } from "../../src/app/api/v1/products/route";
import { PATCH as productsPATCH } from "../../src/app/api/v1/products/[productId]/route";

const mockResolveSessionFromRequest = vi.fn();
const mockListProducts = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();

vi.mock("../../src/lib/session", () => ({
  resolveSessionFromRequest: (...args: unknown[]) => mockResolveSessionFromRequest(...args),
}));

vi.mock("../../src/features/operations/services", () => ({
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
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

  it("returns 201 for admin product create", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "ADMIN" });
    mockCreateProduct.mockResolvedValue({
      product_id: "p2",
      sku: "PT-001",
      name: "PT Session",
      price: 1200,
      product_type: "SERVICE",
      revenue_account_id: "coa-4102",
    });

    const response = await productsPOST(
      new Request("http://localhost/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session",
          price: 1200,
          product_type: "SERVICE",
          revenue_account_id: "coa-4102",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      product_id: "p2",
      revenue_account_id: "coa-4102",
    });
  });

  it("returns 403 for cashier product create", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "CASHIER" });

    const response = await productsPOST(
      new Request("http://localhost/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session",
          price: 1200,
          product_type: "SERVICE",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 200 for admin product update", async () => {
    mockResolveSessionFromRequest.mockResolvedValue({ user_id: "u1", role: "OWNER" });
    mockUpdateProduct.mockResolvedValue({
      product_id: "p2",
      sku: "PT-001",
      name: "PT Session Plus",
      price: 1500,
      product_type: "SERVICE",
      revenue_account_id: "coa-4103",
    });

    const response = await productsPATCH(
      new Request("http://localhost/api/v1/products/p2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: "PT-001",
          name: "PT Session Plus",
          price: 1500,
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
      revenue_account_id: "coa-4103",
    });
  });
});
