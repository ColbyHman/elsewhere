import type { Item } from "./types";

export function isLike(item: Pick<Item, "desire" | "fun">): boolean {
  return item.desire === "like" || item.fun;
}