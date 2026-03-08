import { atom } from "jotai";
import type { Product } from "@/lib/contracts";

export type CartLine = Product & {
  quantity: number;
};

export function addProductToCart(lines: CartLine[], product: Product) {
  const existing = lines.find((line) => line.product_id === product.product_id);

  if (!existing) {
    return [...lines, { ...product, quantity: 1 }];
  }

  return lines.map((line) =>
    line.product_id === product.product_id
      ? { ...line, quantity: line.quantity + 1 }
      : line,
  );
}

export function updateProductQuantity(lines: CartLine[], productId: number, quantity: number) {
  if (quantity <= 0) {
    return lines.filter((line) => line.product_id !== productId);
  }

  return lines.map((line) =>
    line.product_id === productId ? { ...line, quantity } : line,
  );
}

export const cartLinesAtom = atom<CartLine[]>([]);

export const cartSubtotalAtom = atom((get) =>
  get(cartLinesAtom).reduce((sum, line) => sum + line.price * line.quantity, 0),
);

export const cartCountAtom = atom((get) =>
  get(cartLinesAtom).reduce((sum, line) => sum + line.quantity, 0),
);

export const addCartLineAtom = atom(null, (get, set, product: Product) => {
  set(cartLinesAtom, addProductToCart(get(cartLinesAtom), product));
});

export const updateCartLineAtom = atom(
  null,
  (get, set, input: { productId: number; quantity: number }) => {
    set(
      cartLinesAtom,
      updateProductQuantity(get(cartLinesAtom), input.productId, input.quantity),
    );
  },
);

export const removeCartLineAtom = atom(null, (get, set, productId: number) => {
  set(
    cartLinesAtom,
    get(cartLinesAtom).filter((line) => line.product_id !== productId),
  );
});

export const clearCartAtom = atom(null, (_get, set) => {
  set(cartLinesAtom, []);
});