export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const PRODUCT_CATEGORIES = [
  "Coffee",
  "Espresso",
  "Tea",
  "Pastry",
  "Sandwich",
  "Cold Drinks",
  "Dessert",
] as const;

export const DASHBOARD_FILTERS = [
  { label: "Today", value: "today" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
] as const;

export const LOW_STOCK_VARIANT = "text-amber-700 bg-amber-50 border-amber-200";
