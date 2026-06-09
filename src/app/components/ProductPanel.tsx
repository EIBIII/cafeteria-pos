import { useState, useMemo } from 'react';
import { Plus, ChevronLeft } from 'lucide-react';
import { Product, MenuConfig, ModifierGroup } from '../types';

interface Props {
  products:     Product[];
  onAddToOrder: (product: Product, customizations: any) => void;
  menuConfig:   MenuConfig;
  inventory:    import('../types').InventoryItem[];
}

function useModifierSelections(groups: ModifierGroup[]) {
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});

  const reset = (newGroups: ModifierGroup[]) => {
    setSelections(Object.fromEntries(
      newGroups.map(g => [g.id, g.inputType === 'single' ? (g.options[0]?.id ?? '') : [] as string[]])
    ));
  };

  const select = (groupId: string, optionId: string, inputType: 'single' | 'multi') => {
    setSelections(prev => {
      if (inputType === 'single') return { ...prev, [groupId]: optionId };
      const cur = (prev[groupId] as string[]) ?? [];
      return { ...prev, [groupId]: cur.includes(optionId) ? cur.filter(id => id !== optionId) : [...cur, optionId] };
    });
  };

  const extraPrice = (groups: ModifierGroup[]) =>
    groups.reduce((total, group) => {
      const sel = selections[group.id];
      const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
      return total + ids.reduce((sum, id) => {
        const opt = group.options.find(o => o.id === id);
        return sum + (opt?.extraPrice ?? 0);
      }, 0);
    }, 0);

  return { selections, select, reset, extraPrice };
}


// Mapa de colores para badges de modificadores
const MOD_COLORS: Record<string, { btn: string; optBtn: string }> = {
  amber:  { btn: 'bg-amber-600 text-white shadow-md',  optBtn: 'bg-amber-50 border-amber-300 text-amber-800'  },
  blue:   { btn: 'bg-blue-600 text-white shadow-md',   optBtn: 'bg-blue-50 border-blue-300 text-blue-800'    },
  green:  { btn: 'bg-green-600 text-white shadow-md',  optBtn: 'bg-green-50 border-green-300 text-green-800'  },
  violet: { btn: 'bg-violet-600 text-white shadow-md', optBtn: 'bg-violet-50 border-violet-300 text-violet-800'},
  rose:   { btn: 'bg-rose-600 text-white shadow-md',   optBtn: 'bg-rose-50 border-rose-300 text-rose-800'    },
  cyan:   { btn: 'bg-cyan-600 text-white shadow-md',   optBtn: 'bg-cyan-50 border-cyan-300 text-cyan-800'    },
  orange: { btn: 'bg-orange-600 text-white shadow-md', optBtn: 'bg-orange-50 border-orange-300 text-orange-800'},
  indigo: { btn: 'bg-indigo-600 text-white shadow-md', optBtn: 'bg-indigo-50 border-indigo-300 text-indigo-800'},
};
function getModColor(color?: string) {
  return MOD_COLORS[color ?? 'amber'] ?? MOD_COLORS['amber'];
}

const CAT_COLORS: Record<number, string> = {
  0: 'from-red-500 to-orange-500',
  1: 'from-blue-500 to-cyan-500',
  2: 'from-amber-500 to-yellow-500',
  3: 'from-purple-500 to-pink-500',
  4: 'from-green-500 to-teal-500',
};

export default function ProductPanel({ products, onAddToOrder, menuConfig, inventory = [] }: Props) {
  const { categories, sizes, milkTypes, extras, modifierGroups = [] } = menuConfig;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || 'hot');
  const [selectedProduct,    setSelectedProduct]    = useState<Product | null>(null);
  const [size,               setSize]               = useState<string>(sizes[0]?.id || 'chico');
  const [milkType, setMilkType] = useState<string>('');
  const [selectedExtras,     setSelectedExtras]     = useState<string[]>([]);

  const catId = selectedProduct?.category ?? '';

  // ── Filtrar por categoría del producto seleccionado ───────────────────────
  // appliesTo vacío = aplica a todas las categorías
  const visibleSizes = useMemo(() =>
    sizes.filter(s => !s.appliesTo?.length || s.appliesTo.includes(catId)),
    [sizes, catId]);

  const visibleMilks = useMemo(() =>
    milkTypes.filter(m => !m.appliesTo?.length || m.appliesTo.includes(catId)),
    [milkTypes, catId]);

  const visibleExtras = useMemo(() =>
    extras.filter(e => !e.appliesTo?.length || e.appliesTo.includes(catId)),
    [extras, catId]);

  const activeGroups: ModifierGroup[] = useMemo(() => {
    if (!selectedProduct) return [];
    return modifierGroups
      .filter(g => g.options.length > 0 && (!g.appliesTo.length || g.appliesTo.includes(catId)))
      .sort((a, b) => a.position - b.position);
  }, [selectedProduct, modifierGroups, catId]);

  const { selections, select, reset, extraPrice } = useModifierSelections(activeGroups);

  // ── Detectar requeridos desde la receta del producto ─────────────────────
  // Si la receta del producto contiene un ingrediente cuyo nombre incluye
  // "leche", "milk" → el tipo de leche es requerido (no puede quedar en "ninguna")
  // Puedes extender este patrón para otros grupos (azúcar, etc.)
  const recipeRequires = useMemo(() => {
    if (!selectedProduct?.recipe) return { milk: false };
    const ingredientIds = selectedProduct.recipe.map(r => r.ingredientId);
    const ingredientNames = ingredientIds
      .map(id => inventory.find(i => i.id === id)?.name?.toLowerCase() ?? '')
      .filter(Boolean);
    return {
      milk: ingredientNames.some(n => n.includes('leche') || n.includes('milk') || n.includes('crema') || n.includes('nata')),
    };
  }, [selectedProduct, inventory]);

  const filteredProducts = products.filter(p => p.category === selectedCategoryId);

  const handleSelect = (product: Product) => {
    setSelectedProduct(product);
    setSize(sizes[0]?.id || 'chico');
    // Si la receta lleva leche, preseleccionar la primera leche real (no "ninguna")
    const firstRealMilk = milkTypes.find(m => m.id !== 'ninguna')?.id ?? milkTypes[0]?.id ?? '';
    setMilkType(firstRealMilk);
    setSelectedExtras([]);
    const applicable = modifierGroups.filter(g =>
      g.options.length > 0 && (!g.appliesTo.length || g.appliesTo.includes(product.category))
    );
    reset(applicable);
  };

  const toggleExtra = (extraId: string) =>
    setSelectedExtras(prev => prev.includes(extraId) ? prev.filter(e => e !== extraId) : [...prev, extraId]);

  const sizeExtra   = visibleSizes.find(s => s.id === size)?.extraPrice ?? 0;
  const milkExtra   = visibleMilks.find(m => m.id === milkType)?.extraPrice ?? 0;
  const extrasExtra = selectedExtras.reduce((sum, eid) => {
    const e = visibleExtras.find(ex => ex.id === eid);
    return sum + (e?.price ?? 0);
  }, 0);
  const modExtra    = extraPrice(activeGroups);
  const totalPrice  = (selectedProduct?.price ?? 0) + sizeExtra + milkExtra + extrasExtra + modExtra;

  // Nombre legible de la opción seleccionada
  const sizeName   = visibleSizes.find(s => s.id === size)?.name  ?? size;
  const milkName   = visibleMilks.find(m => m.id === milkType)?.name ?? milkType;

  const confirmAddToOrder = () => {
    if (!selectedProduct) return;
    // Validar campos requeridos
    const missingRequired: string[] = [];
    if (visibleSizes.some(s => (s as any).required) && !size)
      missingRequired.push('Tamaño');
    // Requerido por config manual O por receta del producto
    const milkIsRequired = visibleMilks.some(m => (m as any).required) || recipeRequires.milk;
    const milkSelected   = milkType && milkType !== 'ninguna' && milkType !== '';
    if (milkIsRequired && !milkSelected)
      missingRequired.push('Tipo de Leche');
    if (visibleExtras.some(e => (e as any).required) && selectedExtras.length === 0)
      missingRequired.push('Extras');
    activeGroups.filter(g => g.required).forEach(g => {
      const sel = selections[g.id];
      const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
      if (ids.length === 0) missingRequired.push(g.name);
    });
    if (missingRequired.length > 0) {
      alert(`Selecciona los campos requeridos: ${missingRequired.join(', ')}`);
      return;
    }
    onAddToOrder(selectedProduct, {
      size, milkType, sizeName, milkName,
      extras:      selectedExtras,
      extrasNames: selectedExtras.map(eid => visibleExtras.find(e => e.id === eid)?.name ?? eid),
      modifiers:   selections,
      modifiersNames: Object.fromEntries(
        activeGroups.map(g => {
          const sel = selections[g.id];
          const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
          // Clave = "nombre:COLOR:color" para que TicketPanel use el color del badge
          const key = `${g.name}:COLOR:${g.color ?? 'violet'}`;
          return [key, ids.map(id => g.options.find(o => o.id === id)?.name ?? id)];
        })
      ),
      extraPrice: sizeExtra + milkExtra + extrasExtra + modExtra,
      showSize:   visibleSizes.length > 0,
      showMilk:   visibleMilks.length > 0,
    });
    setSelectedProduct(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Menú</h2>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {categories.map((cat, idx) => (
          <button key={cat.id}
            onClick={() => { setSelectedCategoryId(cat.id); setSelectedProduct(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
              selectedCategoryId === cat.id
                ? `bg-gradient-to-r ${CAT_COLORS[idx % 5]} text-white shadow-lg`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <span>{cat.icon}</span>{cat.name}
          </button>
        ))}
      </div>

      {/* Grid de productos */}
      {!selectedProduct ? (
        <div className="grid grid-cols-2 gap-3 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <p className="text-sm">No hay productos en esta categoría</p>
            </div>
          ) : filteredProducts.map(product => (
            <button key={product.id} onClick={() => handleSelect(product)}
              className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-lg transition-all text-left group">
              <div className="text-4xl mb-2.5">{product.image}</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-0.5 group-hover:text-amber-600 leading-tight">{product.name}</h3>
              <p className="text-xl font-bold text-amber-600">${product.price}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-330px)] pr-1">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200 flex items-center gap-4">
            <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-amber-100 rounded-lg flex-shrink-0">
              <ChevronLeft className="w-5 h-5 text-amber-700" />
            </button>
            <div className="text-3xl">{selectedProduct.image}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-800 leading-tight">{selectedProduct.name}</h3>
              <p className="text-lg font-bold text-amber-600">${totalPrice.toFixed(0)}</p>
            </div>
          </div>

          {/* Tamaño — solo si aplica a esta categoría */}
          {visibleSizes.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1">Tamaño {visibleSizes.some(s => (s as any).required) && <span className="text-red-500 text-xs">*</span>}</h4>
              <div className="grid grid-cols-3 gap-2">
                {visibleSizes.map(s => {
                  const isMulti   = (s as any).inputType === 'multi';
                  const selected  = isMulti ? size.split(',').filter(Boolean).includes(s.id) : size === s.id;
                  const handleClick = () => {
                    if (isMulti) {
                      const cur = size.split(',').filter(Boolean);
                      setSize(selected ? cur.filter(x => x !== s.id).join(',') : [...cur, s.id].join(','));
                    } else {
                      setSize(s.id);
                    }
                  };
                  return (
                    <button key={s.id} onClick={handleClick}
                      className={`py-2.5 rounded-xl font-medium text-sm transition-all ${selected ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s.name}
                      {s.extraPrice > 0 && <span className="text-xs block opacity-80">+${s.extraPrice}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tipo de leche — solo si aplica a esta categoría */}
          {visibleMilks.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1">Tipo de Leche {(visibleMilks.some(m => (m as any).required) || recipeRequires.milk) && <span className="text-red-500 text-xs">*</span>}{recipeRequires.milk && <span className="text-xs text-amber-600 font-normal">(incluido en receta)</span>}</h4>
              <div className="grid grid-cols-2 gap-2">
                {visibleMilks.map(m => {
                  const isMulti   = (m as any).inputType === 'multi';
                  const selected  = isMulti ? milkType.split(',').filter(Boolean).includes(m.id) : milkType === m.id;
                  const handleClick = () => {
                    if (isMulti) {
                      const cur = milkType.split(',').filter(Boolean);
                      setMilkType(selected ? cur.filter(x => x !== m.id).join(',') : [...cur, m.id].join(','));
                    } else {
                      setMilkType(m.id);
                    }
                  };
                  // Deshabilitar "Sin leche" si la receta requiere leche
                  const isNone     = m.id === 'ninguna' || m.name.toLowerCase().includes('sin leche') || m.name.toLowerCase().includes('sin milk');
                  const isDisabled = recipeRequires.milk && isNone;
                  return (
                    <button key={m.id} onClick={isDisabled ? undefined : handleClick} disabled={isDisabled}
                      className={`py-2.5 rounded-xl font-medium text-sm transition-all relative ${
                        isDisabled  ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                        : selected  ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {m.name}
                      {m.extraPrice > 0 && <span className="text-xs block opacity-80">+${m.extraPrice}</span>}
                      {isDisabled && <span className="text-xs block opacity-70">No disponible</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modificadores dinámicos */}
          {activeGroups.map(group => {
            const sel = selections[group.id];
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getModColor(group.color).optBtn}`}>
                    {group.name}
                  </span>
                  {group.required && <span className="text-red-500 text-xs">(requerido)</span>}
                  {group.inputType === 'multi' && <span className="text-gray-400 text-xs">· varios</span>}
                </div>
                <div className={`grid gap-2 ${group.options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {group.options.map(opt => {
                    const isSelected = group.inputType === 'single' ? sel === opt.id : (sel as string[]).includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => select(group.id, opt.id, group.inputType)}
                        className={`py-2.5 px-2 rounded-xl font-medium text-sm transition-all flex flex-col items-center border-2 ${isSelected ? getModColor(group.color).btn + ' border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'}`}>
                        <span className="leading-tight">{opt.name}</span>
                        {opt.extraPrice > 0 && <span className="text-xs opacity-80">+${opt.extraPrice}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Extras — solo si aplica a esta categoría */}
          {visibleExtras.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm flex items-center gap-1">Extras {visibleExtras.some(e => (e as any).required) && <span className="text-red-500 text-xs">*</span>}</h4>
              <div className="grid grid-cols-2 gap-2">
                {visibleExtras.map(extra => (
                  <button key={extra.id} onClick={() => toggleExtra(extra.id)}
                    className={`py-2.5 rounded-xl font-medium text-sm transition-all ${selectedExtras.includes(extra.id) ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {extra.name}
                    <span className="text-xs block opacity-80">+${extra.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setSelectedProduct(null)} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 text-sm">Cancelar</button>
            <button onClick={confirmAddToOrder}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 shadow-lg flex items-center justify-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Agregar · ${totalPrice.toFixed(0)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
