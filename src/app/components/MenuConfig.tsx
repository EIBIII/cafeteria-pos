import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, X, Check, Settings,
  Tag, Layers, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, Search,
} from 'lucide-react';
import {
  MenuConfig as MenuConfigType, CategoryOption,
  ModifierGroup, ModifierOption,
  SizeOption, MilkOption, ExtraOption,
} from '../types';

interface Props { config: MenuConfigType; onSave: (c: MenuConfigType) => void; }

type TabId = 'categories' | 'modifiers';

const ALL_EMOJIS = [
  '☕','🥤','🍵','🧋','🍫','🍹','🥛','🍶','🧃','🫖',
  '🥐','🧁','🥯','🥪','🍪','🍰','🎂','🥗','🍕','🍔',
  '🌮','🌯','🍩','🍦','🍧','🍨','🍡','🧇','🥞','🧆',
  '🥙','🫔','🍱','🍣','🥩','🌽','🫕','🥘','🍲','🍛',
  '🥑','🥦','🌶️','🧅','🧄','🥕','🍅','🍆','🥜','🫘',
];

const uid = () => Math.random().toString(36).slice(2, 8);

const COLOR_OPTIONS = [
  { id: 'amber',   label: 'Ámbar',   bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300',   selected: 'bg-amber-200',   btn: 'bg-amber-600',   btnSel: 'border-amber-600 ring-2 ring-amber-400' },
  { id: 'blue',    label: 'Azul',    bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    selected: 'bg-blue-200',    btn: 'bg-blue-600',    btnSel: 'border-blue-600 ring-2 ring-blue-400'   },
  { id: 'green',   label: 'Verde',   bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-300',   selected: 'bg-green-200',   btn: 'bg-green-600',   btnSel: 'border-green-600 ring-2 ring-green-400' },
  { id: 'violet',  label: 'Morado',  bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-300',  selected: 'bg-violet-200',  btn: 'bg-violet-600',  btnSel: 'border-violet-600 ring-2 ring-violet-400'},
  { id: 'rose',    label: 'Rosa',    bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',    selected: 'bg-rose-200',    btn: 'bg-rose-600',    btnSel: 'border-rose-600 ring-2 ring-rose-400'   },
  { id: 'cyan',    label: 'Cian',    bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-300',    selected: 'bg-cyan-200',    btn: 'bg-cyan-600',    btnSel: 'border-cyan-600 ring-2 ring-cyan-400'   },
  { id: 'orange',  label: 'Naranja', bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  selected: 'bg-orange-200',  btn: 'bg-orange-600',  btnSel: 'border-orange-600 ring-2 ring-orange-400'},
  { id: 'indigo',  label: 'Índigo',  bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300',  selected: 'bg-indigo-200',  btn: 'bg-indigo-600',  btnSel: 'border-indigo-600 ring-2 ring-indigo-400'},
];

function getColorStyle(colorId?: string) {
  return COLOR_OPTIONS.find(c => c.id === colorId) ?? COLOR_OPTIONS[0];
}


interface ExtGroup extends ModifierGroup { kind?: string; color?: string; }

const emptyGroup = (): ExtGroup => ({
  id: uid(), name: '', inputType: 'single',
  required: false, position: 0, options: [], appliesTo: [], kind: 'custom', color: 'amber',
});
const emptyOption = (): ModifierOption => ({ id: uid(), name: '', extraPrice: 0 });

// Mantiene sizes/milkTypes/extras sincronizados para que ProductPanel siga funcionando
function syncLegacy(config: MenuConfigType, groups: ExtGroup[]): MenuConfigType {
  const sizes: SizeOption[] = groups
    .filter(g => g.kind === 'size')
    .flatMap(g => g.options.map(o => ({
      id: o.id, name: o.name, extraPrice: o.extraPrice,
      appliesTo: g.appliesTo, inputType: g.inputType, required: g.required,
    })));
  const milkTypes: MilkOption[] = groups
    .filter(g => g.kind === 'milk')
    .flatMap(g => g.options.map(o => ({
      id: o.id, name: o.name, extraPrice: o.extraPrice,
      appliesTo: g.appliesTo, inputType: g.inputType, required: g.required,
    })));
  const extras: ExtraOption[] = groups
    .filter(g => g.kind === 'extra')
    .flatMap(g => g.options.map(o => ({
      id: o.id, name: o.name, price: o.extraPrice,
      appliesTo: g.appliesTo, inputType: g.inputType, required: g.required,
    })));
  return { ...config, sizes, milkTypes, extras, modifierGroups: groups };
}

export default function MenuConfig({ config, onSave }: Props) {
  const groups: ExtGroup[] = useMemo(
    () => [...(config.modifierGroups ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [config.modifierGroups]
  );
  const categories = config.categories;

  const [activeTab,    setActiveTab]    = useState<TabId>('categories');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [showCatForm,  setShowCatForm]  = useState(false);
  const [catForm,      setCatForm]      = useState<Record<string, any>>({});
  const [modForm,      setModForm]      = useState<ExtGroup | null>(null);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [expandedMod,  setExpandedMod]  = useState<string | null>(null);
  const [filterCat,    setFilterCat]    = useState('');   // filtro por categoría
  const [search,       setSearch]       = useState('');   // búsqueda por nombre

  // ── Lista filtrada ─────────────────────────────────────────────────────────
  const visibleGroups = useMemo(() => groups.filter(g => {
    const matchCat  = !filterCat || g.appliesTo.length === 0 || g.appliesTo.includes(filterCat);
    const matchText = !search    || g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  }), [groups, filterCat, search]);

  // ── Reordenar ──────────────────────────────────────────────────────────────
  const moveGroup = (id: string, dir: -1 | 1) => {
    const sorted = [...groups];
    const idx    = sorted.findIndex(g => g.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
    const reindexed = sorted.map((g, i) => ({ ...g, position: i }));
    onSave(syncLegacy(config, reindexed));
  };

  // ── CRUD Categorías ────────────────────────────────────────────────────────
  const cancelCat = () => { setEditingCatId(null); setShowCatForm(false); setCatForm({}); };
  const saveCat   = () => {
    if (!catForm.name?.trim()) return;
    const id   = editingCatId || catForm.name.toLowerCase().replace(/\s+/g, '_');
    const item: CategoryOption = { id, name: catForm.name, icon: catForm.icon || '☕' };
    const updated = editingCatId
      ? categories.map(c => c.id === editingCatId ? item : c)
      : [...categories, item];
    onSave({ ...config, categories: updated });
    cancelCat();
  };
  const deleteCat = (id: string) => onSave({ ...config, categories: categories.filter(c => c.id !== id) });

  // ── CRUD Modificadores ─────────────────────────────────────────────────────
  const saveModGroup = (group: ExtGroup) => {
    if (!group.name.trim() || group.options.filter(o => o.name.trim()).length === 0) return;
    let updated: ExtGroup[];
    if (editingModId) {
      updated = groups.map(g => g.id === editingModId ? { ...group, id: editingModId } : g);
    } else {
      updated = [...groups, { ...group, position: groups.length }];
    }
    onSave(syncLegacy(config, updated));
    setModForm(null); setEditingModId(null);
  };

  const deleteModGroup = (id: string) =>
    onSave(syncLegacy(config, groups.filter(g => g.id !== id).map((g, i) => ({ ...g, position: i }))));

  const addOption    = () => modForm && setModForm({ ...modForm, options: [...modForm.options, emptyOption()] });
  const removeOption = (idx: number) => modForm && setModForm({ ...modForm, options: modForm.options.filter((_, i) => i !== idx) });
  const updateOption = (idx: number, field: keyof ModifierOption, val: any) =>
    modForm && setModForm({ ...modForm, options: modForm.options.map((o, i) => i === idx ? { ...o, [field]: val } : o) });
  const toggleAppliesTo = (catId: string) =>
    modForm && setModForm({
      ...modForm,
      appliesTo: modForm.appliesTo.includes(catId)
        ? modForm.appliesTo.filter(c => c !== catId)
        : [...modForm.appliesTo, catId],
    });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-amber-100 p-3 rounded-xl"><Settings className="w-6 h-6 text-amber-700" /></div>
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Configuración del Menú</h2>
          <p className="text-gray-500 mt-0.5">Categorías y modificadores de personalización</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['categories','modifiers'] as TabId[]).map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); cancelCat(); setModForm(null); setEditingModId(null); setSearch(''); setFilterCat(''); }}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all ${
                activeTab === tab ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {tab === 'categories' ? <Tag className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              {tab === 'categories' ? 'Categorías' : 'Modificadores'}
              {tab === 'modifiers' && groups.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-bold">{groups.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ══ CATEGORÍAS ═══════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <>
              <div className="space-y-2 mb-4">
                {categories.map(cat => (
                  <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {editingCatId === cat.id ? (
                      <div className="p-4 bg-amber-50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                            <input value={catForm.name || ''} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                              className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-lg px-3 py-2 text-sm outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Ícono</label>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white border-2 border-gray-200 rounded-lg">
                              {ALL_EMOJIS.map(e => (
                                <button key={e} type="button" onClick={() => setCatForm({ ...catForm, icon: e })}
                                  className={`text-xl p-1 rounded border-2 transition-all ${catForm.icon === e ? 'border-amber-500 bg-amber-100 scale-110' : 'border-transparent hover:border-gray-200'}`}>{e}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveCat} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"><Check className="w-4 h-4" />Guardar</button>
                          <button onClick={cancelCat} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm"><X className="w-4 h-4" />Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cat.icon}</span>
                          <p className="font-semibold text-gray-800">{cat.name}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingCatId(cat.id); setCatForm({ ...cat }); setShowCatForm(false); }}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteCat(cat.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showCatForm ? (
                <div className="border-2 border-amber-300 rounded-xl p-4 bg-amber-50 space-y-3">
                  <h4 className="font-semibold text-gray-700">Nueva Categoría</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                      <input value={catForm.name || ''} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                        autoFocus className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Ícono</label>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white border-2 border-gray-200 rounded-lg">
                        {ALL_EMOJIS.map(e => (
                          <button key={e} type="button" onClick={() => setCatForm({ ...catForm, icon: e })}
                            className={`text-xl p-1 rounded border-2 transition-all ${catForm.icon === e ? 'border-amber-500 bg-amber-100 scale-110' : 'border-transparent hover:border-gray-200'}`}>{e}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCat} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"><Check className="w-4 h-4" />Agregar</button>
                    <button onClick={cancelCat} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm"><X className="w-4 h-4" />Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setCatForm({ icon: '☕' }); setShowCatForm(true); setEditingCatId(null); }}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-amber-400 text-gray-400 hover:text-amber-600 py-3 rounded-xl font-medium transition-all">
                  <Plus className="w-5 h-5" />Nueva Categoría
                </button>
              )}
            </>
          )}

          {/* ══ MODIFICADORES ════════════════════════════════════════════════ */}
          {activeTab === 'modifiers' && !modForm && (
            <>
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* Búsqueda */}
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar modificador..."
                    className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 focus:border-amber-500 rounded-xl text-sm outline-none" />
                </div>
                {/* Filtro por categoría */}
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 focus:border-amber-500 rounded-xl text-sm outline-none bg-white">
                  <option value="">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                {(search || filterCat) && (
                  <button onClick={() => { setSearch(''); setFilterCat(''); }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <p className="w-full text-xs text-gray-400">
                  Mostrando {visibleGroups.length} de {groups.length} · Usa ▲▼ para cambiar el orden en el POS
                </p>
              </div>

              <div className="space-y-2 mb-4">
                {visibleGroups.length === 0 && (
                  <p className="text-center py-8 text-gray-400 text-sm">No hay modificadores. Crea el primero.</p>
                )}
                {visibleGroups.map((group, idx) => {
                  const realIdx = groups.findIndex(g => g.id === group.id);
                  return (
                    <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-3 hover:bg-gray-50">

                        {/* Flechas de orden */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => moveGroup(group.id, -1)} disabled={realIdx === 0}
                            className="p-1 text-gray-300 hover:text-amber-600 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveGroup(group.id, 1)} disabled={realIdx === groups.length - 1}
                            className="p-1 text-gray-300 hover:text-amber-600 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Número de posición */}
                        <span className="text-xs font-mono text-gray-300 w-5 text-center flex-shrink-0">
                          {realIdx + 1}
                        </span>

                        {/* Info del grupo */}
                        <button onClick={() => setExpandedMod(expandedMod === group.id ? null : group.id)}
                          className="flex items-center gap-3 flex-1 text-left">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColorStyle(group.color).bg} ${getColorStyle(group.color).text} ${getColorStyle(group.color).border}`}>
                                {group.name}
                              </span>
                              {group.required && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Requerido</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {group.options.length} opciones ·{' '}
                              {group.inputType === 'single' ? 'Una opción' : 'Múltiple'}
                              {group.appliesTo.length > 0
                                ? ` · Solo en: ${group.appliesTo.map(id => categories.find(c => c.id === id)?.name ?? id).join(', ')}`
                                : ' · Todas las categorías'}
                            </p>
                          </div>
                          {expandedMod === group.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                            : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                        </button>

                        {/* Acciones */}
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setModForm({ ...group }); setEditingModId(group.id); }}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteModGroup(group.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedMod === group.id && (
                        <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                          {group.options.map(opt => (
                            <span key={opt.id} className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorStyle(group.color).bg} ${getColorStyle(group.color).text} ${getColorStyle(group.color).border}`}>
                              {opt.name}{opt.extraPrice > 0 ? ` +$${opt.extraPrice}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => { setModForm(emptyGroup()); setEditingModId(null); }}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 hover:border-amber-500 text-amber-400 hover:text-amber-600 py-3 rounded-xl font-medium transition-all">
                <Plus className="w-5 h-5" />Nuevo Modificador
              </button>
            </>
          )}

          {/* ══ FORMULARIO MODIFICADOR ════════════════════════════════════════ */}
          {activeTab === 'modifiers' && modForm && (
            <div className="space-y-5">
              <h3 className="font-bold text-gray-800 text-lg">
                {editingModId ? 'Editar modificador' : 'Nuevo modificador'}
              </h3>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                <input value={modForm.name} onChange={e => setModForm({ ...modForm, name: e.target.value })}
                  placeholder="Ej. Tamaño, Tipo de Leche, Endulzante, Cobertura..."
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none" />
              </div>

              {/* Color del badge */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Color del badge</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setModForm({ ...modForm!, color: c.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${c.bg} ${c.text} ${(modForm?.color ?? 'amber') === c.id ? c.btnSel : c.border}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Vista previa:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorStyle(modForm?.color).bg} ${getColorStyle(modForm?.color).text} ${getColorStyle(modForm?.color).border}`}>
                    {modForm?.name || 'Nombre del modificador'}
                  </span>
                </div>
              </div>

              {/* Tipo de selección + Requerido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de selección</label>
                  <div className="flex gap-2">
                    {(['single','multi'] as const).map(t => (
                      <button key={t} onClick={() => setModForm({ ...modForm, inputType: t })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${modForm.inputType === t ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {t === 'single' ? ' Solo uno' : ' Varios'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button onClick={() => setModForm({ ...modForm, required: !modForm.required })}
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${modForm.required ? 'bg-red-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${modForm.required ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Requerido</p>
                    <p className="text-xs text-gray-400">Obligatorio al pedir</p>
                  </div>
                </div>
              </div>

              {/* Aplica a categorías */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Aplica a categorías <span className="font-normal text-gray-400">(vacío = todas)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => toggleAppliesTo(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        modForm.appliesTo.includes(cat.id)
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opciones <span className="font-normal text-gray-400">(mínimo 1)</span>
                </label>
                <div className="space-y-2 mb-3">
                  {modForm.options.map((opt, idx) => (
                    <div key={opt.id} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-300 font-mono w-5 text-center flex-shrink-0">{idx + 1}</span>
                      <input value={opt.name} onChange={e => updateOption(idx, 'name', e.target.value)}
                        placeholder={`Opción ${idx + 1}`}
                        className="flex-1 border-2 border-gray-200 focus:border-amber-500 rounded-xl px-3 py-2 text-sm outline-none" />
                      <div className="relative w-28 flex-shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" min="0" value={opt.extraPrice}
                          onChange={e => updateOption(idx, 'extraPrice', Number(e.target.value))}
                          className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl pl-7 pr-3 py-2 text-sm outline-none" />
                      </div>
                      <button onClick={() => removeOption(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addOption}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium px-3 py-2 hover:bg-amber-50 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />Agregar opción
                </button>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setModForm(null); setEditingModId(null); }}
                  className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={() => saveModGroup(modForm)}
                  disabled={!modForm.name.trim() || modForm.options.filter(o => o.name.trim()).length === 0}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 transition-all">
                  <Check className="w-4 h-4" />{editingModId ? 'Guardar cambios' : 'Crear modificador'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Tip:</span> El orden de los modificadores aquí es el mismo que verá el cajero en el POS.
          Usa las flechas ▲▼ para poner Tamaño arriba, Leche abajo, etc.
          Filtra por categoría para ver solo los que aplican a cierto tipo de producto.
        </p>
      </div>
    </div>
  );
}
