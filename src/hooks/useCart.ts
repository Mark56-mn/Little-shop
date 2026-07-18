import { useEffect, useState } from "react";

export interface CartItem {
  product_id: string;
  title: string;
  price: number;
  image: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
}

const KEY = "plugmart_cart";
const EVENT = "plugmart_cart_changed";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

function keyOf(i: Pick<CartItem, "product_id" | "size" | "color">) {
  return `${i.product_id}|${i.size ?? ""}|${i.color ?? ""}`;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function addItem(item: CartItem) {
    const current = read();
    const idx = current.findIndex((c) => keyOf(c) === keyOf(item));
    if (idx >= 0) current[idx].quantity += item.quantity;
    else current.push(item);
    write(current);
  }

  function removeItem(item: Pick<CartItem, "product_id" | "size" | "color">) {
    write(read().filter((c) => keyOf(c) !== keyOf(item)));
  }

  function setQuantity(item: Pick<CartItem, "product_id" | "size" | "color">, quantity: number) {
    const current = read();
    const idx = current.findIndex((c) => keyOf(c) === keyOf(item));
    if (idx >= 0) {
      current[idx].quantity = Math.max(1, quantity);
      write(current);
    }
  }

  function clear() {
    write([]);
  }

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return { items, count, total, addItem, removeItem, setQuantity, clear };
}
