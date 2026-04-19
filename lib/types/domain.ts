export type UserRole = "admin";

export type OrderStatus = "pending" | "completed" | "cancelled";

export type StockHistoryType = "sale" | "manual_add" | "manual_remove" | "edit" | "manual_restock" | "manual_correction";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface Product {
  id: string;
  name: string;
  nameLowercase: string;
  category: string;
  maintenanceLinkType?: "variant" | "addon" | "modifier";
  maintenanceLinkIds?: string[];
  description?: string;
  price: number;
  discount?: number;
  imageUrl?: string;
  isActive: boolean;
  customPrices?: Record<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  discount?: number;
  qty: number;
  category: string;
  itemType?: "product" | "variant" | "addon" | "modifier";
  variantId?: string;
  addonIds?: string[];
  modifierIds?: string[];
  addonsPrice?: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  itemType?: "product" | "variant" | "addon" | "modifier";
  variantId?: string;
  addonIds?: string[];
  modifierIds?: string[];
  addonsPrice?: number;
}

export interface OrderRecord {
  id: string;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  cashReceived: number;
  change: number;
  customerName?: string;
  status: OrderStatus;
  createdAt?: Date;
  completedAt?: Date;
  archivedAt?: Date;
  dayKey: string;
  itemCount: number;
}

export interface SalesSummary {
  id: string;
  dateKey: string;
  totalSales: number;
  orderCount: number;
  topProducts: Array<{
    productId: string;
    name: string;
    qty: number;
  }>;
  updatedAt?: Date;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  type: StockHistoryType;
  quantityChange: number;
  beforeQty: number;
  afterQty: number;
  referenceOrderId?: string;
  createdAt?: Date;
  performedBy?: string;
}

export interface ProductFormValues {
  name: string;
  category: string;
  maintenanceLinkType?: "variant" | "addon" | "modifier";
  maintenanceLinkIds?: string[];
  description?: string;
  price: number;
  discount?: number;
  imageUrl?: string;
  isActive: boolean;
  customPrices?: Record<string, number>;
}

export interface StockAdjustmentValues {
  ingredientId: string;
  quantityDelta: number;
  reason: Exclude<StockHistoryType, "sale">;
}

export interface MaintenanceCategoryConfig {
  id: string;
  name: string;
  variants: string[];
  addons: string[];
  sizes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditTrailEntry {
  id: string;
  module: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt?: Date;
}

export type AlertLevel = "good" | "informational" | "warning" | "critical";

export interface AlertRecord {
  id: string;
  module: string;
  level: AlertLevel;
  message: string;
  recipientEmail?: string;
  isRead?: boolean;
  emailQueued?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IngredientItem {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductRecipeItem {
  ingredientId: string;
  ingredientName: string;
  qtyUsed: number;
  unit: string;
}

export interface ProductRecipe {
  id: string;
  productId: string;
  productName: string;
  items: ProductRecipeItem[];
  createdAt?: Date;
  updatedAt?: Date;
}
