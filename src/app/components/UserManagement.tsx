import { useState } from 'react';
import {
  UserPlus, Pencil, Trash2, X, Check, Users, Shield,
  Eye, EyeOff, Tag, Plus, AlertTriangle, Lock,
} from 'lucide-react';
import { User, Role, ALL_VIEWS, ViewId } from '../types';

const PROTECTED_ROLE = 'admin';

const AVAILABLE_COLORS = [
  { id: 'amber',   label: 'Ámbar'   },
  { id: 'emerald', label: 'Verde'   },
  { id: 'blue',    label: 'Azul'    },
  { id: 'purple',  label: 'Morado'  },
  { id: 'rose',    label: 'Rosa'    },
  { id: 'cyan',    label: 'Cian'    },
  { id: 'orange',  label: 'Naranja' },
  { id: 'indigo',  label: 'Índigo'  },
];

const colorStyles: Record<string, { badge: string; gradient: string }> = {
  amber:   { badge: 'bg-amber-100 text-amber-800 border-amber-200',       gradient: 'from-amber-600 to-amber-800'    },
  emerald: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', gradient: 'from-emerald-600 to-emerald-800'},
  blue:    { badge: 'bg-blue-100 text-blue-800 border-blue-200',           gradient: 'from-blue-600 to-blue-800'      },
  purple:  { badge: 'bg-purple-100 text-purple-800 border-purple-200',    gradient: 'from-purple-600 to-purple-800'  },
  rose:    { badge: 'bg-rose-100 text-rose-800 border-rose-200',           gradient: 'from-rose-600 to-rose-800'      },
  cyan:    { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',           gradient: 'from-cyan-600 to-cyan-800'      },
  orange:  { badge: 'bg-orange-100 text-orange-800 border-orange-200',    gradient: 'from-orange-600 to-orange-800'  },
  indigo:  { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',    gradient: 'from-indigo-600 to-indigo-800'  },
};
const getStyle = (color: string) => colorStyles[color] ?? colorStyles['blue'];

interface Props {
  users:         User[];
  roles:         Role[];
  onSave:        (users: User[]) => void;
  onSaveRoles:   (roles: Role[]) => void;
}

export default function UserManagement({ users, roles, onSave, onSaveRoles }: Props) {
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Usuarios &amp; Roles</h2>
        <p className="text-gray-500 mt-1">Gestiona el equipo y los permisos de acceso</p>
      </div>
      <div className="flex gap-2 mb-8 border-b border-gray-200">
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Users className="w-4 h-4" />} label="Usuarios" count={users.length} />
        <TabBtn active={tab === 'roles'} onClick={() => setTab('roles')} icon={<Tag   className="w-4 h-4" />} label="Roles"    count={roles.length} />
      </div>
      {tab === 'users'
        ? <UsersPanel  users={users}  roles={roles} onSave={onSave} />
        : <RolesPanel  roles={roles}  users={users} onSave={onSaveRoles} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number;
}) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-semibold text-sm transition-all border-b-2 ${active ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
      {icon}{label}
      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
    </button>
  );
}

// ── USERS PANEL ───────────────────────────────────────────────────────────────
function UsersPanel({ users, roles, onSave }: { users: User[]; roles: Role[]; onSave: (u: User[]) => void }) {
  const emptyForm = { name: '', role: roles.find(r => r.id !== PROTECTED_ROLE)?.id ?? 'cashier', email: '', phone: '', password: '', active: true };
  const [showModal,     setShowModal]     = useState(false);
  const [editingUser,   setEditingUser]   = useState<User | null>(null);
  const [form,          setForm]          = useState(emptyForm);
  const [showPassword,  setShowPassword]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const isAdminUser = (u: User) => u.role === PROTECTED_ROLE;

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...emptyForm, role: roles.find(r => r.id !== PROTECTED_ROLE)?.id ?? 'cashier' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, role: u.role, email: u.email ?? '', phone: u.phone ?? '', password: '', active: u.active !== false });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingUser) {
      const admin = isAdminUser(editingUser);
      onSave(users.map(u => u.id === editingUser.id
        ? {
            ...u,
            name:  form.name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            // Si es admin: no se cambia rol ni estado activo
            ...(admin ? {} : { role: form.role, active: form.active }),
            ...(form.password ? { password: form.password } : {}),
          }
        : u
      ));
    } else {
      onSave([...users, {
        id: 0, name: form.name.trim(), role: form.role,
        email: form.email || undefined, phone: form.phone || undefined,
        password: form.password || '1234', active: form.active,
      }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => { onSave(users.filter(u => u.id !== id)); setConfirmDelete(null); };
  const toggleActive = (u: User) => {
    if (isAdminUser(u)) return; // no-op protegido
    onSave(users.map(x => x.id === u.id ? { ...x, active: !x.active } : x));
  };

  // Roles disponibles para asignar al crear/editar un usuario no-admin
  // El rol admin no aparece en el selector (solo puede haber uno)
  const assignableRoles = roles.filter(r => r.id !== PROTECTED_ROLE);

  return (
    <>
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="flex items-center gap-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-5 py-3 rounded-xl font-semibold shadow-lg transition-all">
          <UserPlus className="w-5 h-5" /> Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map(user => {
          const roleInfo  = roles.find(r => r.id === user.role);
          const style     = getStyle(roleInfo?.color ?? 'blue');
          const initials  = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const protected_ = isAdminUser(user);
          return (
            <div key={user.id} className={`bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md ${user.active === false ? 'border-gray-200 opacity-60' : protected_ ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`bg-gradient-to-br ${style.gradient} w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 relative`}>
                      <span className="text-white font-bold text-base">{initials}</span>
                      {protected_ && (
                        <div className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-0.5">
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{user.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}>{roleInfo?.label ?? user.role}</span>
                    </div>
                  </div>
                  {/* Toggle activo: deshabilitado para admin */}
                  <button
                    onClick={() => toggleActive(user)}
                    disabled={protected_}
                    title={protected_ ? 'El administrador no puede desactivarse' : undefined}
                    className={`w-12 h-6 rounded-full transition-colors relative ${protected_ ? 'opacity-40 cursor-not-allowed' : ''} ${user.active !== false ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${user.active !== false ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="space-y-1 mb-4 text-sm text-gray-500">
                  {user.email && <p>✉ {user.email}</p>}
                  {user.phone && <p>📞 {user.phone}</p>}
                  {!user.email && !user.phone && <p className="text-gray-400 italic">Sin información de contacto</p>}
                  {protected_ && (
                    <p className="text-amber-600 text-xs font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Usuario protegido del sistema
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${user.active !== false ? 'text-emerald-600' : 'text-gray-400'}`}>{user.active !== false ? '● Activo' : '○ Inactivo'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(user)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Botón eliminar: oculto para admin */}
                    {protected_ ? (
                      <div className="p-2 text-gray-200 cursor-not-allowed" title="El administrador no puede eliminarse">
                        <Trash2 className="w-4 h-4" />
                      </div>
                    ) : confirmDelete === user.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(user.id)} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(user.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                {editingUser && isAdminUser(editingUser) && (
                  <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    <Lock className="w-3 h-3" /> Protegido
                  </span>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre completo *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. María González" className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-colors" />
              </div>

              {/* Selector de rol: solo visible si NO es admin */}
              {!(editingUser && isAdminUser(editingUser)) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rol</label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {assignableRoles.map(role => (
                      <button key={role.id} onClick={() => setForm({ ...form, role: role.id })}
                        className={`py-2.5 rounded-xl font-medium text-sm transition-all ${form.role === role.id ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso cuando se edita admin */}
              {editingUser && isAdminUser(editingUser) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>El rol y el estado activo del Administrador no pueden modificarse.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@tecnm.mx" className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="477-123-4567" className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Contraseña {editingUser && <span className="text-gray-400 font-normal">(dejar en blanco para no cambiar)</span>}
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? '••••••' : 'Mínimo 4 caracteres'} className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 pr-10 outline-none transition-colors" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Toggle activo: oculto para admin */}
              {!(editingUser && isAdminUser(editingUser)) && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm({ ...form, active: !form.active })} className={`w-12 h-6 rounded-full transition-colors relative ${form.active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">Usuario activo</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 transition-all">
                <Check className="w-4 h-4" /> {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── ROLES PANEL ───────────────────────────────────────────────────────────────
function RolesPanel({ roles, users, onSave }: { roles: Role[]; users: User[]; onSave: (r: Role[]) => void }) {
  const emptyForm = { id: '', label: '', color: 'blue', allowedViews: ['pos','orders','account'] as ViewId[], requiresCashCut: false };
  const [showModal,     setShowModal]     = useState(false);
  const [editingRole,   setEditingRole]   = useState<Role | null>(null);
  const [form,          setForm]          = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error,         setError]         = useState('');

  const isProtectedRole = (r: Role) => r.id === PROTECTED_ROLE;

  const openCreate = () => { setEditingRole(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit   = (r: Role) => {
    setEditingRole(r);
    setForm({ id: r.id, label: r.label, color: r.color, allowedViews: [...r.allowedViews], requiresCashCut: r.requiresCashCut });
    setError('');
    setShowModal(true);
  };

  const toggleView = (viewId: ViewId) => setForm(f => ({
    ...f,
    allowedViews: f.allowedViews.includes(viewId)
      ? f.allowedViews.filter(v => v !== viewId)
      : [...f.allowedViews, viewId],
  }));

  const handleSave = () => {
    if (!form.label.trim()) { setError('El nombre del rol es requerido.'); return; }
    const slug = form.id.trim() || form.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!editingRole && roles.some(r => r.id === slug)) { setError('Ya existe un rol con ese identificador.'); return; }

    if (editingRole && isProtectedRole(editingRole)) {
      // Admin: solo guardar color y requiresCashCut — label y allowedViews sin cambio
      onSave(roles.map(r => r.id === editingRole.id
        ? { ...r, color: form.color, requiresCashCut: form.requiresCashCut }
        : r
      ));
    } else {
      const updated: Role = {
        id: editingRole ? editingRole.id : slug,
        label: form.label.trim(), color: form.color,
        allowedViews: form.allowedViews, requiresCashCut: form.requiresCashCut,
      };
      onSave(editingRole ? roles.map(r => r.id === editingRole.id ? updated : r) : [...roles, updated]);
    }
    setShowModal(false);
  };

  const handleDelete  = (id: string) => { onSave(roles.filter(r => r.id !== id)); setConfirmDelete(null); };
  const usersWithRole = (roleId: string) => users.filter(u => u.role === roleId).length;

  return (
    <>
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="flex items-center gap-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-5 py-3 rounded-xl font-semibold shadow-lg transition-all">
          <Plus className="w-5 h-5" /> Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map(role => {
          const style     = getStyle(role.color);
          const count     = usersWithRole(role.id);
          const protected_ = isProtectedRole(role);
          return (
            <div key={role.id} className={`bg-white rounded-2xl shadow-sm border-2 hover:shadow-md transition-all p-5 ${protected_ ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${style.gradient} w-12 h-12 rounded-xl flex items-center justify-center shadow-md relative`}>
                    <Shield className="w-6 h-6 text-white" />
                    {protected_ && (
                      <div className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-0.5">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{role.label}</h3>
                    <code className="text-xs text-gray-400 font-mono">{role.id}</code>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>{role.label}</span>
                {role.requiresCashCut && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Corte requerido</span>}
                {protected_ && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1"><Lock className="w-3 h-3" />Protegido</span>}
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Acceso a vistas</p>
                <div className="flex flex-wrap gap-1">
                  {ALL_VIEWS.map(v => (
                    <span key={v.id} className={`text-xs px-2 py-0.5 rounded-md font-medium ${role.allowedViews.includes(v.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                      {v.label}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">{count} usuario{count !== 1 ? 's' : ''} asignado{count !== 1 ? 's' : ''}</p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => openEdit(role)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </button>
                {protected_ ? (
                  <div className="p-2 text-gray-200 cursor-not-allowed" title="El rol Administrador no puede eliminarse">
                    <Trash2 className="w-4 h-4" />
                  </div>
                ) : confirmDelete === role.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(role.id)} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => count > 0
                      ? alert(`No puedes eliminar "${role.label}" porque hay ${count} usuario(s) con ese rol.`)
                      : setConfirmDelete(role.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-800">{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h3>
                {editingRole && isProtectedRole(editingRole) && (
                  <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    <Lock className="w-3 h-3" /> Protegido
                  </span>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">

              {/* Aviso cuando se edita el rol admin */}
              {editingRole && isProtectedRole(editingRole) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>El nombre y las vistas del rol <strong>Administrador</strong> no pueden modificarse. Solo puedes cambiar el color y el corte de caja.</p>
                </div>
              )}

              {/* Nombre: solo editable si NO es admin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del rol *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  disabled={!!(editingRole && isProtectedRole(editingRole))}
                  placeholder="Ej. Barista, Supervisor..."
                  className="w-full border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              {/* Color: siempre editable */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Color del badge</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(c => {
                    const s = getStyle(c.id);
                    return (
                      <button key={c.id} onClick={() => setForm({ ...form, color: c.id })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${form.color === c.id ? 'border-gray-700 scale-105 shadow-md' : 'border-transparent'} ${s.badge}`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vistas: bloqueadas para admin */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Vistas permitidas</label>
                  {editingRole && isProtectedRole(editingRole) && (
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3 h-3" /> No editable</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_VIEWS.map(v => {
                    const enabled   = form.allowedViews.includes(v.id);
                    const locked    = !!(editingRole && isProtectedRole(editingRole));
                    return (
                      <button key={v.id}
                        onClick={() => !locked && toggleView(v.id)}
                        disabled={locked}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          locked
                            ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                            : enabled
                              ? 'border-amber-400 bg-amber-50 text-amber-800'
                              : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}>
                        <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs ${
                          locked ? 'bg-gray-200 text-gray-400' : enabled ? 'bg-amber-500 text-white' : 'bg-gray-200'
                        }`}>{enabled ? '✓' : ''}</span>
                        <span className={locked ? 'text-gray-400' : ''}>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corte de caja: siempre editable */}
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <button onClick={() => setForm({ ...form, requiresCashCut: !form.requiresCashCut })} className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.requiresCashCut ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.requiresCashCut ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Requiere corte de caja</p>
                  <p className="text-xs text-gray-500">Este rol deberá registrar su corte antes de cerrar sesión.</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!form.label.trim()} className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 transition-all">
                <Check className="w-4 h-4" /> {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
