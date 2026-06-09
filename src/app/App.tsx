import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Coffee, ShoppingBag, Package, BarChart2,
  Users, UserCircle, Receipt, Settings, Loader2,
} from 'lucide-react';
import ProductPanel        from './components/ProductPanel';
import TicketPanel         from './components/TicketPanel';
import ProductManagement   from './components/ProductManagement';
import InventoryManagement from './components/InventoryManagement';
import Dashboard           from './components/Dashboard';
import Login               from './components/Login';
import UserManagement      from './components/UserManagement';
import AccountView         from './components/AccountView';
import OrdersView          from './components/OrdersView';
import MenuConfig          from './components/MenuConfig';
import CashCutModal        from './components/CashCutModal';
import {
  Product, OrderItem, InventoryItem, Sale, User,
  MenuConfig as MenuConfigType, Role, CashCut, ViewId,
} from './types';
import {
  token, healthCheck, authApi,
  productsApi, inventoryApi, usersApi, rolesApi,
  salesApi, cashCutsApi,
  categoriesApi, modifierGroupsApi,
} from '../lib/apiClient';

// ── MenuConfig base (solo para el estado inicial vacío, NO se persiste en localStorage) ──
const EMPTY_MENU: MenuConfigType = {
  sizes:          [],
  milkTypes:      [],
  extras:         [],
  categories:     [],
  modifierGroups: [],
};

// ── Mappers API → tipos del frontend ─────────────────────────────────────────
const mapProduct = (p: any): Product => ({
  id:       p.id,
  name:     p.name,
  category: p.categoryId ?? (typeof p.category === 'object' ? p.category?.id : p.category) ?? '',
  price:    p.price,
  image:    p.image ?? '☕',
  recipe:   (p.recipe ?? []).map((r: any) => ({
    ingredientId: r.inventoryItemId ?? r.ingredientId,
    quantity:     r.quantity,
  })),
});

const mapUser = (u: any): User => ({
  id:     u.id,
  name:   u.name,
  email:  u.email,
  phone:  u.phone,
  role:   u.roleId ?? (typeof u.role === 'object' ? u.role?.id : u.role) ?? '',
  active: u.active ?? true,
  password: '',
});

const mapRole = (r: any): Role => ({
  id:              r.id,
  label:           r.label,
  color:           r.color ?? 'blue',
  allowedViews:    Array.isArray(r.allowedViews) ? r.allowedViews : [],
  requiresCashCut: r.requiresCashCut ?? false,
});

const mapInventory = (i: any): InventoryItem => ({
  id:            i.id,
  name:          i.name,
  quantity:      i.quantity,
  unit:          i.unit,
  minStock:      i.minStock ?? 100,
  lastRestocked: i.lastRestocked,
});

const mapSale = (s: any): Sale => ({
  id:            s.id,
  date:          s.date ?? s.createdAt ?? new Date().toISOString(),
  items:         (s.items ?? []).map((it: any) => ({
    id:       it.id,
    quantity: it.quantity,
    subtotal: it.unitPrice ?? it.subtotal ?? 0,
    size: '', milkType: '', extras: [], modifiers: {},
    product: {
      id:       it.productId ?? it.product?.id ?? 0,
      name:     it.product?.name ?? '',
      category: it.product?.categoryId ?? it.product?.category ?? '',
      price:    it.unitPrice ?? 0,
      image:    it.product?.image ?? '☕',
    },
  })),
  subtotal:      s.subtotal,
  tax:           s.tax,
  total:         s.total,
  userId:        s.userId,
  userName:      s.user?.name ?? s.userName ?? '',
  customerName:  s.customerName,
  customerEmail: s.customerEmail,
  orderNumber:   s.orderNumber ?? s.id,
});

// ── Mapper: grupos de modificadores DB → frontend ─────────────────────────────
const mapModifierGroup = (g: any) => ({
  id:        String(g.id),
  name:      g.name,
  inputType: g.inputType  ?? 'single',
  required:  g.required   ?? false,
  position:  g.position   ?? 0,
  color:     g.color      ?? 'amber',
  appliesTo: Array.isArray(g.appliesTo) ? g.appliesTo : [],
  kind:      g.kind       ?? 'custom',
  options: (g.options ?? []).map((o: any) => ({
    id:         String(o.id),
    name:       o.name,
    extraPrice: o.extraPrice ?? 0,
  })),
});

type View = 'pos'|'products'|'inventory'|'dashboard'|'users'|'account'|'orders'|'menu-config';

// =============================================================================
export default function App() {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [inventory,    setInventory]    = useState<InventoryItem[]>([]);
  const [users,        setUsers]        = useState<User[]>([]);
  const [roles,        setRoles]        = useState<Role[]>([]);
  const [sales,        setSales]        = useState<Sale[]>([]);
  const [cashCuts,     setCashCuts]     = useState<CashCut[]>([]);
  const [menuConfig,   setMenuConfig]   = useState<MenuConfigType>(EMPTY_MENU);
  const [orderItems,   setOrderItems]   = useState<OrderItem[]>([]);
  const [currentView,  setCurrentView]  = useState<View>('pos');
  const [currentUser,  setCurrentUser]  = useState<User | null>(null);
  const [loginTime,    setLoginTime]    = useState<Date>(new Date());
  const [showCashCut,  setShowCashCut]  = useState(false);
  const [orderCounter, setOrderCounter] = useState(1);
  const [checking,     setChecking]     = useState(true);
  const [apiOnline,    setApiOnline]    = useState(false);
  const [apiError,     setApiError]     = useState('');
  const [loadingData,  setLoadingData]  = useState(false);

  // Ref para evitar doble carga en React StrictMode
  const loadedRef = useRef(false);

  // ── 1. Al iniciar: solo verificar que la API responde ─────────────────────
  const checkApi = useCallback(async () => {
    setChecking(true);
    setApiError('');
    try {
      await fetch('https://cafetecnm.up.railway.app/health', { signal: AbortSignal.timeout(5000) }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setApiError('No se puede conectar con la API en localhost:4000.\nVerifica que Docker esté corriendo.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkApi(); }, [checkApi]);

  // ── NOTA: se eliminó el useEffect que guardaba menuConfig en localStorage ──

  // ── 2. Cargar datos DESPUÉS del login (ya tenemos JWT) ───────────────────
  const loadData = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoadingData(true);
    try {
      // Carga en paralelo: datos operativos + configuración del menú
      const [
        prods, inv, usrs, rls, sls, cuts,
        cats, modGroups,
      ] = await Promise.all([
        productsApi.list(),
        inventoryApi.list(),
        usersApi.list(),
        rolesApi.list(),
        salesApi.list(),
        cashCutsApi.list(),
        // MenuConfig desde la BD
        categoriesApi.list().catch(() => [] as any[]),
        modifierGroupsApi.list().catch(() => [] as any[]),
      ]);

      setProducts(prods.map(mapProduct));
      setInventory(inv.map(mapInventory));
      setUsers(usrs.map(mapUser));
      setRoles(rls.map(mapRole));
      setSales(sls.map(mapSale));
      setCashCuts(cuts.map((c: any) => ({
        id: c.id, userId: c.userId, userName: c.user?.name ?? '',
        date: c.date, loginTime: c.loginTime,
        salesCount: c.salesCount, totalSales: c.totalSales,
        expectedCash: c.expectedCash, actualCash: c.actualCash,
        difference: c.difference, notes: c.notes ?? '',
      })));

      // Construir MenuConfig completamente desde la BD
      const mappedGroups = modGroups.map(mapModifierGroup);
      const dbCategories = cats.map((c: any) => ({
        id: c.id, name: c.name, icon: c.icon ?? '☕',
      }));

      // sizes, milkTypes y extras los deriva syncLegacy() en MenuConfig.tsx
      // a partir de los grupos con kind === 'size' | 'milk' | 'extra'
      setMenuConfig({
        categories:     dbCategories,
        sizes:          [],
        milkTypes:      [],
        extras:         [],
        modifierGroups: mappedGroups,
      });

      if (sls.length > 0) {
        const max = Math.max(...sls.map((s: any) => s.orderNumber ?? 0));
        setOrderCounter(max + 1);
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err.message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // ── Permisos ───────────────────────────────────────────────────────────────
  const currentRole  = currentUser ? roles.find(r => r.id === currentUser.role) ?? null : null;
  const allowedViews = currentRole?.allowedViews ??
    ['pos','orders','products','inventory','menu-config','users','dashboard','account'] as ViewId[];
  const canView = (v: ViewId) => allowedViews.includes(v);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await authApi.login(email, password);
      token.set(res.token);
      setCurrentUser(mapUser(res.user));
      setLoginTime(new Date());
      setCurrentView('pos');
      loadedRef.current = false;
      await loadData();
      return null;
    } catch (err: any) {
      return err.message ?? 'Credenciales incorrectas';
    }
  };

  const doLogout = () => {
    token.clear();
    loadedRef.current = false;
    setCurrentUser(null);
    setOrderItems([]);
    setProducts([]);
    setInventory([]);
    setUsers([]);
    setRoles([]);
    setSales([]);
    setCashCuts([]);
    setMenuConfig(EMPTY_MENU);
    setCurrentView('pos');
  };

  const handleLogoutRequest = () => {
    if (!currentUser) return;
    const role = roles.find(r => r.id === currentUser.role);
    if (role?.requiresCashCut) setShowCashCut(true);
    else doLogout();
  };

  const handleCashCutConfirm = async (cut: CashCut) => {
    try {
      await cashCutsApi.create({
        loginTime: cut.loginTime, salesCount: cut.salesCount,
        totalSales: cut.totalSales, expectedCash: cut.expectedCash,
        actualCash: cut.actualCash, notes: cut.notes,
      });
    } catch { /* no bloquear el logout */ }
    setCashCuts(prev => [cut, ...prev]);
    setShowCashCut(false);
    doLogout();
  };

  // ── Órdenes ────────────────────────────────────────────────────────────────
  const calculatePrice = (basePrice: number, c: any) => {
    let total = basePrice;
    menuConfig.sizes.find(s => s.id === c.size)?.extraPrice &&
      (total += menuConfig.sizes.find(s => s.id === c.size)!.extraPrice);
    menuConfig.milkTypes.find(m => m.id === c.milkType)?.extraPrice &&
      (total += menuConfig.milkTypes.find(m => m.id === c.milkType)!.extraPrice);
    (c.extras as string[] ?? []).forEach(eid => {
      const e = menuConfig.extras.find(ex => ex.id === eid);
      if (e) total += e.price;
    });
    if (typeof c.extraPrice === 'number') total += c.extraPrice;
    return total;
  };

  const addToOrder = (product: Product, c: any) =>
    setOrderItems(prev => [...prev, {
      id: Date.now(), product, quantity: 1,
      size:     c.size     ?? '',
      milkType: c.milkType ?? '',
      extras:   c.extras   ?? [],
      modifiers: c.modifiers ?? {},
      sizeName:       c.sizeName       ?? c.size     ?? '',
      milkName:       c.milkName       ?? c.milkType ?? '',
      extrasNames:    c.extrasNames    ?? c.extras   ?? [],
      modifiersNames: c.modifiersNames ?? {},
      subtotal: calculatePrice(product.price, c),
    } as any]);

  const updateQuantity = (itemId: number, change: number) =>
    setOrderItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + change) } : i
    ));

  const removeItem = (id: number) => setOrderItems(prev => prev.filter(i => i.id !== id));
  const clearOrder = () => setOrderItems([]);

  const completeOrder = async (customerName?: string, customerEmail?: string) => {
    if (!orderItems.length || !currentUser) return;
    const subtotal = orderItems.reduce((s, i) => s + i.subtotal * i.quantity, 0);
    const tax      = subtotal * 0.16;
    const total    = subtotal + tax;
    try {
      const created = await salesApi.create({
        items: orderItems.map(i => ({
          productId: i.product.id, quantity: i.quantity,
          unitPrice: i.subtotal, subtotal: i.subtotal * i.quantity,
          modifierOptionIds: [],
        })),
        subtotal, tax, total,
        customerName:  customerName  || undefined,
        customerEmail: customerEmail || undefined,
      });
      setSales(prev => [mapSale({ ...created, user: { name: currentUser.name } }), ...prev]);
      setOrderCounter(c => c + 1);
      clearOrder();
      inventoryApi.list().then(inv => setInventory(inv.map(mapInventory))).catch(() => {});
    } catch (err: any) {
      alert('Error al registrar la venta: ' + err.message);
    }
  };

  // ── CRUD Productos ─────────────────────────────────────────────────────────
  const saveProducts = async (updated: Product[]) => {
    const added   = updated.filter(p => p.id === 0);
    const removed = products.filter(p => !updated.find(x => x.id === p.id));
    const edited  = updated.filter(p => {
      if (p.id === 0) return false;
      const o = products.find(x => x.id === p.id);
      return o && JSON.stringify(o) !== JSON.stringify(p);
    });
    const buildRecipe = (p: Product) =>
      (p.recipe ?? [])
        .filter(r => r.ingredientId > 0 && r.quantity > 0)
        .map(r => ({ inventoryItemId: r.ingredientId, quantity: r.quantity }));
    try {
      for (const p of added)   await productsApi.create({ name: p.name, price: p.price, image: p.image, categoryId: p.category, recipe: buildRecipe(p) });
      for (const p of removed) await productsApi.delete(p.id);
      for (const p of edited)  await productsApi.update(p.id, { name: p.name, price: p.price, image: p.image, categoryId: p.category, recipe: buildRecipe(p) });
      setProducts(await productsApi.list().then(l => l.map(mapProduct)));
    } catch (err: any) { alert('Error al guardar producto: ' + err.message); }
  };

  // ── CRUD Inventario ────────────────────────────────────────────────────────
  const saveInventory = async (updated: InventoryItem[]) => {
    const added   = updated.filter(i => i.id === 0);
    const removed = inventory.filter(i => !updated.find(x => x.id === i.id));
    const edited  = updated.filter(i => {
      if (i.id === 0) return false;
      const o = inventory.find(x => x.id === i.id);
      return o && (o.name !== i.name || o.quantity !== i.quantity || o.unit !== i.unit || o.minStock !== i.minStock);
    });
    try {
      for (const i of added)   await inventoryApi.create({ name: i.name, quantity: i.quantity, unit: i.unit, minStock: i.minStock ?? 0 });
      for (const i of removed) await inventoryApi.delete(i.id);
      for (const i of edited)  await inventoryApi.update(i.id, { name: i.name, quantity: i.quantity, unit: i.unit, minStock: i.minStock ?? 0 });
      setInventory(await inventoryApi.list().then(l => l.map(mapInventory)));
    } catch (err: any) { alert('Error al guardar inventario: ' + err.message); }
  };

  // ── CRUD Usuarios ──────────────────────────────────────────────────────────
  const saveUsers = async (updated: User[]) => {
    const added   = updated.filter(u => u.id === 0);
    const removed = users.filter(u => !updated.find(x => x.id === u.id));
    const edited  = updated.filter(u => {
      if (u.id === 0) return false;
      const o = users.find(x => x.id === u.id);
      if (!o) return false;
      return (
        o.name   !== u.name   ||
        o.email  !== u.email  ||
        o.phone  !== u.phone  ||
        o.role   !== u.role   ||
        o.active !== u.active ||
        (u.password && u.password.length > 0)
      );
    });
    try {
      for (const u of added)
        await usersApi.create({ name: u.name, email: u.email || undefined, phone: u.phone || undefined, roleId: u.role, password: u.password || '1234', active: u.active });
      for (const u of removed)
        await usersApi.delete(u.id);
      for (const u of edited)
        await usersApi.update(u.id, {
          name:   u.name,
          email:  u.email  || undefined,
          phone:  u.phone  || undefined,
          roleId: u.role,
          active: u.active,
          ...(u.password && u.password.length > 0 ? { password: u.password } : {}),
        });
      setUsers(await usersApi.list().then(l => l.map(mapUser)));
    } catch (err: any) { alert('Error al guardar usuario: ' + (err?.message ?? JSON.stringify(err))); }
  };

  // ── CRUD Roles ─────────────────────────────────────────────────────────────
  const saveRolesViaApi = async (updated: Role[]) => {
    try {
      const added   = updated.filter(r => !roles.find(x => x.id === r.id));
      const removed = roles.filter(r => !updated.find(x => x.id === r.id));
      const edited  = updated.filter(r => {
        const o = roles.find(x => x.id === r.id);
        return o && JSON.stringify(o) !== JSON.stringify(r);
      });
      for (const r of added)   await rolesApi.create(r);
      for (const r of removed) await rolesApi.delete(r.id);
      for (const r of edited)  await rolesApi.update(r.id, { label: r.label, color: r.color, allowedViews: r.allowedViews, requiresCashCut: r.requiresCashCut });
      setRoles(await rolesApi.list().then(l => l.map(mapRole)));
    } catch (err: any) { alert('Error al guardar rol: ' + err.message); }
  };

  // ── CRUD MenuConfig — persiste en la BD ────────────────────────────────────
  const saveMenuConfig = async (newConfig: MenuConfigType) => {
    // Actualizar estado inmediatamente para respuesta visual
    setMenuConfig(newConfig);

    // Persistir cambios en la BD en segundo plano
    try {
      // ── Sincronizar categorías ────────────────────────────────────────────
      const oldCats  = menuConfig.categories;
      const newCats  = newConfig.categories;
      const addedCats   = newCats.filter(c => !oldCats.find(x => x.id === c.id));
      const removedCats = oldCats.filter(c => !newCats.find(x => x.id === c.id));
      const editedCats  = newCats.filter(c => {
        const o = oldCats.find(x => x.id === c.id);
        return o && (o.name !== c.name || o.icon !== c.icon);
      });
      for (const c of addedCats)   await categoriesApi.create({ id: c.id, name: c.name, icon: c.icon, position: newCats.indexOf(c) }).catch(console.error);
      for (const c of removedCats) await categoriesApi.delete(c.id).catch(console.error);
      for (const c of editedCats)  await categoriesApi.update(c.id, { name: c.name, icon: c.icon, position: newCats.indexOf(c) }).catch(console.error);

      // ── Sincronizar modifierGroups ────────────────────────────────────────
      const oldGroups = menuConfig.modifierGroups;
      const newGroups = newConfig.modifierGroups;
      const addedGroups   = newGroups.filter(g => !oldGroups.find(x => x.id === g.id));
      const removedGroups = oldGroups.filter(g => !newGroups.find(x => x.id === g.id));
      const editedGroups  = newGroups.filter(g => {
        const o = oldGroups.find(x => x.id === g.id);
        return o && JSON.stringify(o) !== JSON.stringify(g);
      });

      for (const g of addedGroups) {
        await modifierGroupsApi.create({
          name: g.name, inputType: g.inputType, required: g.required,
          position: g.position, color: g.color ?? 'amber',
          appliesTo: g.appliesTo ?? [], kind: (g as any).kind ?? 'custom',
          options: g.options.map((o, idx) => ({ name: o.name, extraPrice: o.extraPrice, position: idx })),
        }).catch(console.error);
      }

      for (const g of removedGroups) {
        const numId = Number(g.id);
        if (!isNaN(numId)) await modifierGroupsApi.delete(numId).catch(console.error);
      }

      for (const g of editedGroups) {
        const numId = Number(g.id);
        if (!isNaN(numId)) {
          await modifierGroupsApi.update(numId, {
            name: g.name, inputType: g.inputType, required: g.required,
            position: g.position, color: g.color ?? 'amber',
            appliesTo: g.appliesTo ?? [], kind: (g as any).kind ?? 'custom',
            options: g.options.map((o, idx) => ({
              id:         o.id,
              name:       o.name,
              extraPrice: o.extraPrice,
              position:   idx,
            })),
          }).catch(console.error);
        }
      }

      // Recargar desde la BD para obtener IDs reales de grupos recién creados
      const freshGroups = await modifierGroupsApi.list().catch(() => [] as any[]);
      setMenuConfig(prev => ({
        ...prev,
        modifierGroups: freshGroups.map(mapModifierGroup),
      }));

    } catch (err: any) {
      console.error('Error sincronizando menuConfig con la BD:', err.message);
    }
  };

  // ── Pantallas de estado ────────────────────────────────────────────────────
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4">
        <div className="bg-amber-100 p-4 rounded-xl"><Coffee className="w-10 h-10 text-amber-700" /></div>
        <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
        <p className="text-gray-500 font-medium">Conectando con la base de datos...</p>
      </div>
    </div>
  );

  if (!apiOnline) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🔌</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sin conexión a la API</h2>
        <p className="text-gray-500 text-sm mb-6 whitespace-pre-line">{apiError}</p>
        <div className="bg-gray-900 rounded-xl p-4 text-left mb-6">
          <p className="text-green-400 font-mono text-xs">cd backend</p>
          <p className="text-green-400 font-mono text-xs">docker compose up -d</p>
        </div>
        <button onClick={checkApi}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-semibold transition-colors">
          Reintentar conexión
        </button>
      </div>
    </div>
  );

  if (!currentUser) return <Login onLogin={handleLogin} />;

  if (loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center gap-4">
        <div className="bg-amber-100 p-4 rounded-xl"><Coffee className="w-10 h-10 text-amber-700" /></div>
        <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
        <p className="text-gray-500 font-medium">Cargando configuración del menú...</p>
      </div>
    </div>
  );

  // ── Nav ────────────────────────────────────────────────────────────────────
  const ALL_NAV: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'pos',         label: 'Punto de Venta', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'orders',      label: 'Mis Pedidos',    icon: <Receipt     className="w-4 h-4" /> },
    { id: 'products',    label: 'Productos',       icon: <Coffee      className="w-4 h-4" /> },
    { id: 'inventory',   label: 'Inventario',      icon: <Package     className="w-4 h-4" /> },
    { id: 'menu-config', label: 'Menú Config',     icon: <Settings    className="w-4 h-4" /> },
    { id: 'users',       label: 'Usuarios',        icon: <Users       className="w-4 h-4" /> },
    { id: 'dashboard',   label: 'Dashboard',       icon: <BarChart2   className="w-4 h-4" /> },
    { id: 'account',     label: 'Mi Cuenta',       icon: <UserCircle  className="w-4 h-4" /> },
  ];
  const visibleNav = ALL_NAV.filter(item => canView(item.id as ViewId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <header className="bg-gradient-to-r from-amber-900 to-amber-700 text-white shadow-lg sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="bg-white/10 p-2 rounded-xl"><Coffee className="w-6 h-6" /></div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">Café TecNM León</h1>
              <p className="text-amber-200 text-xs">Sistema POS</p>
            </div>
          </div>
          <nav className="flex-1 flex gap-1 overflow-x-auto scrollbar-none">
            {visibleNav.map(item => (
              <button key={item.id} onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  currentView === item.id
                    ? 'bg-white text-amber-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}>
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => setCurrentView('account')}
            className="flex items-center gap-2 flex-shrink-0 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{currentUser.name.split(' ')[0]}</p>
              <p className="text-amber-200 text-xs">{currentRole?.label ?? currentUser.role}</p>
            </div>
          </button>
        </div>
      </header>

      <main>
        {currentView === 'pos' && (
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 lg:col-span-7">
                <ProductPanel products={products} onAddToOrder={addToOrder} menuConfig={menuConfig} inventory={inventory} />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <TicketPanel orderItems={orderItems} onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeItem} onClearOrder={clearOrder} onCompleteOrder={completeOrder} />
              </div>
            </div>
          </div>
        )}
        {currentView === 'orders'      && canView('orders')      && <OrdersView        sales={sales} currentUser={currentUser} />}
        {currentView === 'products'    && canView('products')    && <ProductManagement  products={products} inventory={inventory} menuConfig={menuConfig} onSave={saveProducts} />}
        {currentView === 'inventory'   && canView('inventory')   && <InventoryManagement inventory={inventory} onSave={saveInventory} />}
        {currentView === 'menu-config' && canView('menu-config') && <MenuConfig          config={menuConfig} onSave={saveMenuConfig} />}
        {currentView === 'users'       && canView('users')       && <UserManagement      users={users} onSave={saveUsers} roles={roles} onSaveRoles={saveRolesViaApi} />}
        {currentView === 'dashboard'   && canView('dashboard')   && <Dashboard           sales={sales} users={users} cashCuts={cashCuts} />}
        {currentView === 'account'     && canView('account')     && (
          <AccountView currentUser={currentUser} loginTime={loginTime} sales={sales} onLogout={handleLogoutRequest} />
        )}
      </main>

      {showCashCut && currentUser && (
        <CashCutModal currentUser={currentUser} loginTime={loginTime} sales={sales}
          onConfirm={handleCashCutConfirm} onCancel={() => setShowCashCut(false)} />
      )}
    </div>
  );
}
