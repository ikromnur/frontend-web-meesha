import { Cart, Size } from "@/types/cart";

// Sesi lokal untuk development: disimpan di memory
// Catatan: akan hilang jika server restart
class CartStorage {
  private storage: Map<string, Cart[]> = new Map();

  list(userKey: string): Cart[] {
    return this.storage.get(userKey) ?? [];
  }

  add(userKey: string, item: Omit<Cart, "id"> & { id?: string }): Cart {
    const id = item.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const current = this.list(userKey);

    // Gabungkan item yang sama berdasarkan product_id + size
    const existingIndex = current.findIndex(
      (i) => i.product_id === item.product_id && i.size === item.size
    );

    if (existingIndex >= 0) {
      current[existingIndex].quantity += item.quantity;
    } else {
      current.push({ ...item, id });
    }

    this.storage.set(userKey, current);
    return current.find((i) => i.id === id)!;
  }

  update(
    userKey: string,
    id: string,
    changes: Partial<Pick<Cart, "quantity" | "size">>
  ): boolean {
    const current = this.list(userKey);
    const item = current.find((i) => i.id === id);
    if (!item) return false;
    if (typeof changes.quantity === "number") item.quantity = changes.quantity;
    if (changes.size) item.size = changes.size as Size;
    this.storage.set(userKey, current);
    return true;
  }

  remove(userKey: string, id: string): boolean {
    const current = this.list(userKey);
    const next = current.filter((i) => i.id !== id);
    const changed = next.length !== current.length;
    if (changed) this.storage.set(userKey, next);
    return changed;
  }

  clear(userKey: string): void {
    this.storage.delete(userKey);
  }
}

export const cartStorage = new CartStorage();

// Helper untuk map size dari produk (S/M/L/XL) ke enum Cart Size
export function mapProductSizeToCartSize(input?: string): Size {
  switch ((input || "").toUpperCase()) {
    case "S":
      return Size.SMALL;
    case "M":
      return Size.MEDIUM;
    case "L":
      return Size.LARGE;
    case "XL":
      return Size.EXTRA_LARGE;
    default:
      return Size.MEDIUM;
  }
}