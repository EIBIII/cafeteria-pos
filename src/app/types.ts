export interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  password?: string;
  active: boolean;
}

export type ViewId = 'pos' | 'orders' | 'products' | 'inventory' | 'dashboard' | 'users' | 'account' | 'menu-config';

export const ALL_VIEWS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'pos',         label: 'Punto de Venta', icon: '' },
  { id: 'orders',      label: 'Mis Pedidos',    icon: '' },
  { id: 'products',    label: 'Productos',       icon: '' },
  { id: 'inventory',   label: 'Inventario',      icon: '' },
  { id: 'menu-config', label: 'Menú Config',     icon: '' },
  { id: 'users',       label: 'Usuarios',        icon: '' },
  { id: 'dashboard',   label: 'Dashboard',       icon: '' },
  { id: 'account',     label: 'Mi Cuenta',       icon: '' },
];

export interface Role {
  id: string;
  label: string;
  color: string;
  allowedViews: ViewId[];
  requiresCashCut: boolean;
}

export interface CashCut {
  id: number;
  userId: number;
  userName: string;
  date: string;
  loginTime: string;
  salesCount: number;
  totalSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes: string;
}

export interface SizeOption    { id: string; name: string; extraPrice: number; appliesTo?: string[]; inputType?: 'single' | 'multi'; required?: boolean; }
export interface MilkOption    { id: string; name: string; extraPrice: number; appliesTo?: string[]; inputType?: 'single' | 'multi'; required?: boolean; }
export interface ExtraOption   { id: string; name: string; price: number; inventoryId?: number; appliesTo?: string[]; inputType?: 'single' | 'multi'; required?: boolean; }
export interface CategoryOption { id: string; name: string; icon: string; }

export interface ModifierOption { id: string; name: string; extraPrice: number; }
export interface ModifierGroup {
  id: string; name: string;
  inputType: 'single' | 'multi';
  required: boolean; position: number;
  options: ModifierOption[];
  appliesTo: string[];  // IDs de categorías donde aplica. Vacío = todas
  color?: string;       // color del badge: amber, blue, green, violet, rose, cyan, orange, indigo
}

export interface MenuConfig {
  sizes: SizeOption[];
  milkTypes: MilkOption[];
  extras: ExtraOption[];
  categories: CategoryOption[];
  modifierGroups: ModifierGroup[];
}

export interface RecipeIngredient { ingredientId: number; quantity: number; unit?: string; }

export interface Product {
  id: number; name: string; category: string;
  price: number; image: string; recipe?: RecipeIngredient[];
}

export interface OrderItem {
  id: number; product: Product; quantity: number;
  size: string; milkType: string; extras: string[];
  modifiers: Record<string, string | string[]>;
  subtotal: number;
}

export interface InventoryItem {
  id: number; name: string; quantity: number;
  unit: string; minStock?: number; lastRestocked?: string;
}

export interface Sale {
  id: number; date: string; items: OrderItem[];
  subtotal: number; tax: number; total: number;
  userId: number; userName: string;
  customerName?: string; customerEmail?: string; orderNumber?: number;
}