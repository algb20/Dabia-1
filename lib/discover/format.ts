import type { Availability } from "./types";

export function money(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export function availabilityLabel(a: Availability): { text: string; tone: "good" | "warn" | "bad" } {
  switch (a) {
    case "in_stock":
      return { text: "In stock", tone: "good" };
    case "low":
      return { text: "Low stock", tone: "warn" };
    case "preorder":
      return { text: "Pre-order", tone: "warn" };
    case "out":
      return { text: "Out of stock", tone: "bad" };
  }
}

export function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
