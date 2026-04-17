import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: Date | string | number) {
  return format(new Date(value), "MMM d, yyyy h:mm a");
}

export function getDayKey(value = new Date()) {
  return format(value, "yyyy-MM-dd");
}

export function generateOrderId(date = new Date()) {
  const day = format(date, "yyyyMMdd");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `COF-${day}-${randomPart}`;
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
