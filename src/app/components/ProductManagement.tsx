import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChefHat, Search } from 'lucide-react';
import { Product, InventoryItem, RecipeIngredient, MenuConfig } from '../types';

interface Props {
  products:   Product[];
  inventory:  InventoryItem[];
  menuConfig: MenuConfig;
  onSave: (products: Product[]) => void;
}

const ALL_EMOJIS = [
  '☕','🥤','🍵','🧋','🍫','🍹','🥛','🍶','🧃','🫖',
  '🥐','🧁','🥯','🥪','🍪','🍰','🎂','🥗','🍕','🍔',
  '🌮','🌯','🍩','🍦','🍧','🍨','🍡','🧇','🥞','🧆',
  '🥙','🫔','🍱','🍣','🥩','🌽','🫕','🥘','🍲','🍛',
  '🥑','🥦','🌶️','🧅','🧄','🥕','🍅','🍆','🥜','🫘',
];

export default function ProductManagement({ products, inventory, menuConfig, onSave }: Props) {
  const [editingProduct,    setEditingProduct]    = useState<Product | null>(null);
  const [isCreating,        setIsCreating]        = useState(false);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPrice,    setFilterPrice]    = useState<'all'|'asc'|'desc'>('all');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: menuConfig.categories[0]?.id || 'hot', price: 0, image: '☕', recipe: [],
  });

  const categories = menuConfig.categories;

  const getCategoryLabel = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = !filterCategory || p.category === filterCategory;
      return matchSearch && matchCat;
    });
    if (filterPrice === 'asc')  list = [...list].sort((a, b) => a.price - b.price);
    if (filterPrice === 'desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, search, filterCategory, filterPrice]);

  const handleEdit   = (p: Product) => { setEditingProduct(p); setFormData(p); setIsCreating(false); };
  const handleCreate = () => { setEditingProduct(null); setFormData({ name: '', category: categories[0]?.id || 'hot', price: 0, image: '☕', recipe: [] }); setIsCreating(true); };
  const handleCancel = () => { setEditingProduct(null); setIsCreating(false); };

  const handleSave = () => {
    if (!formData.name || !formData.price) return;
    if (isCreating) {
      onSave([...products, { id: 0, name: formData.name!, category: formData.category!, price: formData.price!, image: formData.image || '☕', recipe: formData.recipe || [] }]);
    } else if (editingProduct) {
      onSave(products.map(p => p.id === editingProduct.id ? { ...p, ...formData } : p));
    }
    setEditingProduct(null); setIsCreating(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este producto?')) onSave(products.filter(p => p.id !== id));
  };

  const addRecipeIngredient = () =>
    setFormData({ ...formData, recipe: [...(formData.recipe || []), { ingredientId: 0, quantity: 0 }] });
  const updateRecipeIngredient = (i: number, field: keyof RecipeIngredient, value: any) => {
    const r = [...(formData.recipe || [])]; r[i] = { ...r[i], [field]: value };
    setFormData({ ...formData, recipe: r });
  };
  const removeRecipeIngredient = (i: number) =>
    setFormData({ ...formData, recipe: (formData.recipe || []).filter((_, idx) => idx !== i) });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestión de Productos</h2>
            <p className="text-gray-500 text-sm mt-1">{products.length} productos registrados</p>
          </div>
          {!isCreating && !editingProduct && (
            <button onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg">
              <Plus className="w-5 h-5" /> Nuevo Producto
            </button>
          )}
        </div>

        {/* ── Filtros ── */}
        {!isCreating && !editingProduct && (
          <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 focus:border-green-500 rounded-xl text-sm outline-none transition-colors" />
            </div>

            {/* Filtro categoría (dinámico) */}
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 focus:border-green-500 rounded-xl text-sm outline-none bg-white transition-colors">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Ordenar por precio */}
            <div className="flex gap-1">
              {(['all','asc','desc'] as const).map(v => (
                <button key={v} onClick={() => setFilterPrice(v)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    filterPrice === v ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
                  {v === 'all' ? 'Precio' : v === 'asc' ? '$ ↑' : '$ ↓'}
                </button>
              ))}
            </div>

            {/* Reset */}
            {(search || filterCategory || filterPrice !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterPrice('all'); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            <p className="w-full text-xs text-gray-400 mt-1">
              Mostrando {filtered.length} de {products.length} productos
            </p>
          </div>
        )}

        {/* Form */}
        {(isCreating || editingProduct) && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6 border-2 border-amber-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{isCreating ? 'Crear Nuevo Producto' : 'Editar Producto'}</h3>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 outline-none" placeholder="Ej: Café Americano" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio ($) *</label>
                <input type="number" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 outline-none" placeholder="0.00" min="0" step="0.01" />
              </div>

              {/* Categoría dinámica */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                <select value={formData.category || categories[0]?.id} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-amber-500 outline-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ícono</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white border-2 border-gray-200 rounded-xl">
                  {ALL_EMOJIS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setFormData({ ...formData, image: emoji })}
                      className={`text-2xl p-1.5 rounded-lg border-2 transition-all ${formData.image === emoji ? 'border-amber-500 bg-amber-100 scale-110' : 'border-transparent hover:border-gray-200'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Receta */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <ChefHat className="w-5 h-5" /> Receta (Ingredientes)
                </label>
                <button type="button" onClick={addRecipeIngredient}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
              {formData.recipe && formData.recipe.length > 0 ? (
                <div className="space-y-2">
                  {formData.recipe.map((ing, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-lg border border-gray-200">
                      <select value={ing.ingredientId} onChange={e => updateRecipeIngredient(idx, 'ingredientId', Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none text-sm">
                        <option value={0}>Seleccionar ingrediente...</option>
                        {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                      </select>
                      <input type="number" value={ing.quantity} onChange={e => updateRecipeIngredient(idx, 'quantity', Number(e.target.value))}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none text-sm" placeholder="Cant." min="0" step="0.1" />
                      <button type="button" onClick={() => removeRecipeIngredient(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic bg-white p-4 rounded-lg border border-gray-200">Sin ingredientes. Haz clic en "Agregar" para comenzar.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
                <X className="w-5 h-5" /> Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg">
                <Save className="w-5 h-5" /> Guardar Producto
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {!isCreating && !editingProduct && (
          <>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No se encontraron productos</p>
                <p className="text-sm mt-1">Intenta cambiar los filtros</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(product => (
                <div key={product.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{product.image}</div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{product.name}</h3>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          {getCategoryLabel(product.category)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(product)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 mb-2">${product.price}</p>
                  {product.recipe && product.recipe.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                        <ChefHat className="w-3 h-3" /> {product.recipe.length} ingrediente{product.recipe.length !== 1 ? 's' : ''}
                      </p>
                      {product.recipe.slice(0, 3).map((ing, i) => {
                        const inv = inventory.find(inv => inv.id === ing.ingredientId);
                        return <p key={i} className="text-xs text-gray-600">• {inv?.name || 'Ingrediente'}: {ing.quantity} {inv?.unit || ''}</p>;
                      })}
                      {product.recipe.length > 3 && <p className="text-xs text-gray-400 italic">+ {product.recipe.length - 3} más...</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
