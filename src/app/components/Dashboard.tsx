import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Coffee, Award, Wallet, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { Sale, User, CashCut } from '../types';

interface DashboardProps {
  sales: Sale[];
  users: User[];
  cashCuts?: CashCut[];
}

export default function Dashboard({ sales, users, cashCuts = [] }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');

  // ── Métricas generales ────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = now.getFullYear();

    const currentMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    const lastMonthSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const saleYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === saleYear;
    });

    const currentMonthRevenue = currentMonthSales.reduce((sum, sale) => sum + sale.total, 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + sale.total, 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    currentMonthSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.name;
        if (!productSales[key]) productSales[key] = { name: key, quantity: 0, revenue: 0 };
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal * item.quantity;
      });
    });

    const topProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    const userSalesMap: Record<number, { user: User; sales: number; revenue: number }> = {};
    currentMonthSales.forEach(sale => {
      if (!userSalesMap[sale.userId]) {
        const user = users.find(u => u.id === sale.userId);
        if (user) userSalesMap[sale.userId] = { user, sales: 0, revenue: 0 };
      }
      if (userSalesMap[sale.userId]) {
        userSalesMap[sale.userId].sales += 1;
        userSalesMap[sale.userId].revenue += sale.total;
      }
    });

    const topUsers = Object.values(userSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { currentMonthRevenue, lastMonthRevenue, revenueGrowth, totalSales: currentMonthSales.length, topProducts, topUsers };
  }, [sales, users]);

  // ── Métricas de cortes ────────────────────────────────────────────────────
  const cutMetrics = useMemo(() => {
    if (!cashCuts.length) return null;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthCuts = cashCuts.filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalDifference = monthCuts.reduce((sum, c) => sum + c.difference, 0);
    const shortCuts = monthCuts.filter(c => c.difference < 0).length;
    const exactCuts = monthCuts.filter(c => c.difference === 0).length;
    const overCuts  = monthCuts.filter(c => c.difference > 0).length;

    return { totalCuts: monthCuts.length, totalDifference, shortCuts, exactCuts, overCuts, monthCuts };
  }, [cashCuts]);

  // ── Datos para gráfica de cortes (últimos 30 días) ────────────────────────
  const cutsChartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (13 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayCuts = cashCuts.filter(c => c.date.startsWith(dateStr));
      const totalDiff = dayCuts.reduce((sum, c) => sum + c.difference, 0);
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        cortes: dayCuts.length,
        diferencia: Number(totalDiff.toFixed(2)),
        vendido: Number(dayCuts.reduce((s, c) => s + c.totalSales, 0).toFixed(2)),
      };
    });
  }, [cashCuts]);

  // ── Gráficas de ventas ────────────────────────────────────────────────────
  const dailySalesData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      const daySales = sales.filter(sale => sale.date.startsWith(dateStr));
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        revenue: Number(daySales.reduce((sum, s) => sum + s.total, 0).toFixed(2)),
        orders: daySales.length,
      };
    });
  }, [sales]);

  const weeklySalesData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - ((11 - i) * 7));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const weekSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      });
      return { week: `S${i + 1}`, revenue: Number(weekSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)), orders: weekSales.length };
    });
  }, [sales]);

  const monthlySalesData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
      return {
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        revenue: Number(revenue.toFixed(2)),
        profit: Number((revenue * 0.35).toFixed(2)),
        orders: monthSales.length,
      };
    });
  }, [sales]);

  const categoryData = useMemo(() => {
    const categories = { hot: 0, cold: 0, food: 0 } as Record<string, number>;
    sales.forEach(sale => sale.items.forEach(item => { categories[item.product.category] = (categories[item.product.category] ?? 0) + item.quantity; }));
    return [
      { name: 'Bebidas Calientes', value: categories['hot'] ?? 0, color: '#ef4444' },
      { name: 'Bebidas Frías',     value: categories['cold'] ?? 0, color: '#3b82f6' },
      { name: 'Alimentos',         value: categories['food'] ?? 0, color: '#f59e0b' },
    ];
  }, [sales]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard de Análisis</h2>
        <p className="text-gray-500 text-sm mt-1">Métricas, ventas y cortes de caja</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<DollarSign className="w-6 h-6 text-white" />}
          bgClass="bg-green-500"
          wrapClass="from-green-50 to-emerald-50 border-green-200"
          label="Ingresos del Mes"
          value={`$${metrics.currentMonthRevenue.toFixed(2)}`}
          sub={`${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}% vs mes anterior`}
          subClass={metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}
          trailing={metrics.revenueGrowth >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
        />
        <KpiCard
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          bgClass="bg-blue-500"
          wrapClass="from-blue-50 to-cyan-50 border-blue-200"
          label="Ventas del Mes"
          value={`${metrics.totalSales}`}
          sub={`Promedio: $${metrics.totalSales > 0 ? (metrics.currentMonthRevenue / metrics.totalSales).toFixed(2) : '0'} por venta`}
          subClass="text-gray-500"
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          bgClass="bg-purple-500"
          wrapClass="from-purple-50 to-pink-50 border-purple-200"
          label="Ganancia Estimada"
          value={`$${(metrics.currentMonthRevenue * 0.35).toFixed(2)}`}
          sub="Margen: 35%"
          subClass="text-gray-500"
        />
        <KpiCard
          icon={<Users className="w-6 h-6 text-white" />}
          bgClass="bg-amber-500"
          wrapClass="from-amber-50 to-orange-50 border-amber-200"
          label="Usuarios Activos"
          value={`${users.filter(u => u.active !== false).length}`}
          sub="Vendedores registrados"
          subClass="text-gray-500"
        />
      </div>

      {/* ── Cortes de Caja — Resumen ── */}
      {cutMetrics && cutMetrics.totalCuts > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-bold text-gray-800">Cortes de Caja — Este Mes</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-gray-800">{cutMetrics.totalCuts}</p>
              <p className="text-xs text-gray-500 mt-1">Cortes registrados</p>
            </div>
            <div className={`text-center p-4 rounded-xl ${cutMetrics.totalDifference < 0 ? 'bg-red-50' : cutMetrics.totalDifference > 0 ? 'bg-blue-50' : 'bg-emerald-50'}`}>
              <p className={`text-3xl font-bold ${cutMetrics.totalDifference < 0 ? 'text-red-600' : cutMetrics.totalDifference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                {cutMetrics.totalDifference > 0 ? '+' : ''}${cutMetrics.totalDifference.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Diferencia acumulada</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-3xl font-bold text-red-600">{cutMetrics.shortCuts}</p>
              </div>
              <p className="text-xs text-gray-500">Con faltante</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-3xl font-bold text-emerald-600">{cutMetrics.exactCuts + cutMetrics.overCuts}</p>
              </div>
              <p className="text-xs text-gray-500">Exactos / sobrantes</p>
            </div>
          </div>

          {/* Gráfica de cortes */}
          {cashCuts.length > 0 && (
            <>
              <h4 className="text-sm font-semibold text-gray-600 mb-3">Diferencia por día (últimas 2 semanas)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={cutsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, name: string) => [
                    name === 'diferencia' ? `$${v}` : name === 'vendido' ? `$${v}` : v,
                    name === 'diferencia' ? 'Diferencia ($)' : name === 'vendido' ? 'Vendido ($)' : 'Cortes',
                  ]} />
                  <Legend />
                  <Bar dataKey="cortes" fill="#f59e0b" name="Cortes" />
                  <Area type="monotone" dataKey="diferencia" fill="#fecaca" stroke="#ef4444" name="Diferencia ($)" />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {/* ── Sin cortes registrados aún ── */}
      {cashCuts.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 flex items-center gap-4">
          <div className="bg-amber-200 p-3 rounded-xl flex-shrink-0">
            <Wallet className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">Aún no hay cortes de caja registrados</p>
            <p className="text-sm text-amber-600 mt-0.5">Los cortes aparecen aquí cuando los usuarios cierran su sesión.</p>
          </div>
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Ventas por Período</h3>
            <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none">
              <option value="day">Últimos 30 días</option>
              <option value="week">Últimas 12 semanas</option>
              <option value="month">Últimos 12 meses</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeRange === 'day' ? dailySalesData : timeRange === 'week' ? weeklySalesData : monthlySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={timeRange === 'day' ? 'date' : timeRange === 'week' ? 'week' : 'month'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} name="Ingresos ($)" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Órdenes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Distribución por Categoría</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                {categoryData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Monthly Bar ── */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Ingresos y Ganancia Mensual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlySalesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Ingresos ($)" />
            <Bar dataKey="profit" fill="#10b981" name="Ganancia ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Rankings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Coffee className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-bold text-gray-800">Top 10 Productos Más Vendidos</h3>
          </div>
          <div className="space-y-3">
            {metrics.topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>{index + 1}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                </div>
                <p className="font-bold text-green-600">${product.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Ranking de Vendedores</h3>
          </div>
          <div className="space-y-3">
            {metrics.topUsers.map((userSale, index) => (
              <div key={userSale.user.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>{index + 1}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{userSale.user.name}</p>
                  <p className="text-sm text-gray-500">{userSale.sales} ventas realizadas</p>
                </div>
                <p className="font-bold text-blue-600">${userSale.revenue.toFixed(2)}</p>
              </div>
            ))}
            {metrics.topUsers.length === 0 && <p className="text-center text-gray-500 py-8">No hay datos de vendedores aún</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card helper ───────────────────────────────────────────────────────────
function KpiCard({ icon, bgClass, wrapClass, label, value, sub, subClass, trailing }: {
  icon: React.ReactNode; bgClass: string; wrapClass: string;
  label: string; value: string; sub: string; subClass: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={`bg-gradient-to-br ${wrapClass} rounded-xl p-6 border-2`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`${bgClass} p-3 rounded-xl`}>{icon}</div>
        {trailing}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className={`text-xs mt-2 ${subClass}`}>{sub}</p>
    </div>
  );
}
