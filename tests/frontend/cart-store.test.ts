import { createStore } from "jotai";
import { addProductToCart, updateProductQuantity, type CartLine, cartLinesAtom, setCartLineTrainerAtom } from "@/features/pos/cart-store";
import type { Product } from "@/lib/contracts";

const water: Product = {
  product_id: 101,
  sku: "WATER-01",
  name: "Mineral Water",
  price: 25,
  product_type: "GOODS",
};

const ptSingle: Product = {
  product_id: 201,
  sku: "PT-01",
  name: "Personal Training 1 Session",
  price: 500,
  product_type: "SERVICE",
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

describe("cart store trainer binding", () => {
  it("sets trainer_id and trainer_name on a cart line", () => {
    const store = createStore();
    store.set(cartLinesAtom, [{ ...ptSingle, quantity: 1 }]);

    store.set(setCartLineTrainerAtom, {
      productId: ptSingle.product_id,
      trainerId: "t1",
      trainerName: "สมชาย ยิมเนส",
    });

    const lines = store.get(cartLinesAtom);
    expect(lines).toHaveLength(1);
    expect(lines[0].trainer_id).toBe("t1");
    expect(lines[0].trainer_name).toBe("สมชาย ยิมเนส");
  });

  it("clears trainer when trainerId is undefined", () => {
    const store = createStore();
    store.set(cartLinesAtom, [
      { ...ptSingle, quantity: 1, trainer_id: "t1", trainer_name: "สมชาย" },
    ]);

    store.set(setCartLineTrainerAtom, {
      productId: ptSingle.product_id,
      trainerId: undefined,
      trainerName: undefined,
    });

    const lines = store.get(cartLinesAtom);
    expect(lines[0].trainer_id).toBeUndefined();
    expect(lines[0].trainer_name).toBeUndefined();
  });

  it("does not affect other cart lines", () => {
    const store = createStore();
    store.set(cartLinesAtom, [
      { ...water, quantity: 2 },
      { ...ptSingle, quantity: 1 },
    ]);

    store.set(setCartLineTrainerAtom, {
      productId: ptSingle.product_id,
      trainerId: "t2",
      trainerName: "พิมพ์พร",
    });

    const lines = store.get(cartLinesAtom);
    expect(lines[0].trainer_id).toBeUndefined();
    expect(lines[1].trainer_id).toBe("t2");
  });
});