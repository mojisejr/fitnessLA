import { addProductToCart, updateProductQuantity, type CartLine } from "@/features/pos/cart-store";
import type { Product } from "@/lib/contracts";

const water: Product = {
  product_id: 101,
  sku: "WATER-01",
  name: "Mineral Water",
  price: 25,
  product_type: "GOODS",
};

describe("cart store helpers", () => {
  it("adds the same product by incrementing quantity", () => {
    const firstPass = addProductToCart([], water);
    const secondPass = addProductToCart(firstPass, water);

    expect(secondPass).toEqual<CartLine[]>([
      {
        ...water,
        quantity: 2,
      },
    ]);
  });

  it("removes the line when quantity becomes zero", () => {
    const existing: CartLine[] = [{ ...water, quantity: 2 }];
    const updated = updateProductQuantity(existing, water.product_id, 0);

    expect(updated).toEqual([]);
  });
});