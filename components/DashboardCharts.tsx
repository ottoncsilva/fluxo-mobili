import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Area, AreaChart
} from 'recharts';
import { useProjects } from '../context/ProjectContext';
import { addBusinessDays } from '../utils/dateUtils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type TimePeriod = 'month' | '3m' | '6m' | '12m' | 'year' | 'all';

const periodLabels: Record<TimePeriod, string> = {
    month: 'Mês Atual',
    '3m': 'Últimos 3 Meses',
    '6m': 'Últimos 6 Meses',
    '12m': 'Últimos 12 Meses',
    year: 'Ano Atual',
    all: 'Todos'
};

function getDateBoundary(period: TimePeriod): Date | null {
    const now = new Date();
    switch (period) {
        case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
        case '3m': { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; }
        case '6m': { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; }
        case '12m': { const d = new Date(); d.setMonth(d.getMonth() - 12); return d; }
        case 'year': return new Date(now.getFullYear(), 0, 1);
        case 'all': return null;
    }
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

// ─────────────────────────────────────────────────────────────────────────────
// KPI Cards
// ─────────────────────────────────────────────────────────────────────────────
export const DashboardKPIs: React.FC = () => {
    const { batches, projects, workflowConfig, companySettings, updateCompanySettings, currentUser } = useProjects();
    const [period, setPeriod] = useState<TimePeriod>('month');
    const [editingGoal, setEditingGoal] = useState(false);
    const [goalInput, setGoalInput] = useState('');

    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Proprietario';

    const kpiData = useMemo(() => {
        const boundary = getDateBoundary(period);
        const filteredProjects = boundary
            ? projects.filter(p => new Date(p.created_at) >= boundary)
            : projects;

        const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
        const filteredBatches = batches.filter(b => filteredProjectIds.has(b.projectId));

        // Projetos ativos (excluindo concluídos e perdidos)
        let activeProjects = 0;
        filteredBatches.forEach(b => {
            if (b.phase !== '9.0' && b.phase !== '9.1') activeProjects++;
        });

        // Venda efetivada = fase >= 2.9, excluindo perdidos (9.1)
        const effectuatedSales = filteredBatches.filter(b => {
            const stepNum = parseFloat(b.phase);
            return stepNum >= 2.9 && b.phase !== '9.1';
        });
        const effectuatedIds = new Set(effectuatedSales.map(b => b.projectId));

        const totalSales = filteredProjects.reduce((acc, p) => {
            if (!effectuatedIds.has(p.id)) return acc;
            return acc + (p.contractValue || p.total_estimated_value || 0);
        }, 0);

        const effectuatedCount = effectuatedSales.length;
        const ticketMedio = effectuatedCount > 0 ? totalSales / effectuatedCount : 0;

        // Taxa de conversão: efetivadas vs elegíveis (excluindo perdidos)
        const eligibleCount = filteredBatches.filter(b => b.phase !== '9.1').length;
        const conversionRate = eligibleCount > 0
            ? ((effectuatedCount / eligibleCount) * 100).toFixed(1)
            : '0.0';

        // Tarefas em atraso (SLA vencido)
        const now = new Date();
        const overdueCount = filteredBatches.filter(b => {
            if (b.phase === '9.0' || b.phase === '9.1') return false;
            const step = workflowConfig[b.phase];
            if (!step || step.sla === 0) return false;
            const deadline = addBusinessDays(new Date(b.lastUpdated), step.sla, companySettings?.holidays);
            return deadline < now;
        }).length;

        const totalInPeriod = filteredProjects.length;

        return { totalSales, activeProjects, conversionRate, totalInPeriod, effectuatedCount, ticketMedio, overdueCount };
    }, [batches, projects, workflowConfig, companySettings, period]);

    const goal = companySettings?.monthlySalesGoal || 0;
    // Para a barra de meta, usamos sempre o mês atual (independente do filtro)
    const currentMonthSales = useMemo(() => {
        const boundary = new Date();
        boundary.setDate(1); boundary.setHours(0, 0, 0, 0);
        const ids = new Set(
            batches
                .filter(b => parseFloat(b.phase) >= 2.9 && b.phase !== '9.1')
                .map(b => b.projectId)
        );
        return projects
            .filter(p => ids.has(p.id) && new Date(p.contractDate || p.created_at) >= boundary)
            .reduce((acc, p) => acc + (p.contractValue || p.total_estimated_value || 0), 0);
    }, [batches, projects]);

    const goalProgress = goal > 0 ? Math.min((currentMonthSales / goal) * 100, 100) : 0;

    const handleSaveGoal = () => {
        const parsed = parseFloat(goalInput.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(parsed) && parsed >= 0 && updateCompanySettings && companySettings) {
            updateCompanySettings({ ...companySettings, monthlySalesGoal: parsed });
        }
        setEditingGoal(false);
    };

    return (
        <div className="space-y-4 mb-8">
            {/* Period Filter */}
            <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
                <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as TimePeriod)}
                    className="rounded-lg border-slate-200 dark:border-slate-700 dark:bg-[#1a2632] text-sm font-medium text-slate-700 dark:text-slate-300 py-1.5 px-3 focus:ring-primary focus:border-primary"
                >
                    {Object.entries(periodLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* KPI Cards — row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Volume de Vendas */}
                <div className="bg-white dark:bg-[#1a2632] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Volume de Vendas</p>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                        {fmt(kpiData.totalSales)}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {kpiData.effectuatedCount} venda{kpiData.effectuatedCount !== 1 ? 's' : ''} efetivada{kpiData.effectuatedCount !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Ticket Médio */}
                <div className="bg-white dark:bg-[#1a2632] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ticket Médio</p>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                        {fmt(kpiData.ticketMedio)}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">Por venda efetivada</p>
                </div>

                {/* Projetos Ativos */}
                <div className="bg-white dark:bg-[#1a2632] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Projetos Ativos</p>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                        {kpiData.activeProjects}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">{kpiData.totalInPeriod} no período</p>
                </div>

                {/* Taxa de Conversão + Em Atraso */}
                <div className="bg-white dark:bg-[#1a2632] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Conversão</p>
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
                        {kpiData.conversionRate}%
                    </h3>
                    <p className="text-[10px] mt-1">
                        {kpiData.overdueCount > 0
                            ? <span className="text-rose-500 font-semibold">{kpiData.overdueCount} tarefa{kpiData.overdueCount !== 1 ? 's' : ''} em atraso</span>
                            : <span className="text-emerald-500 font-semibold">Sem atrasos</span>
                        }
                    </p>
                </div>
            </div>

            {/* Meta de Vendas (mês atual) */}
            {(goal > 0 || isAdmin) && (
                <div className="bg-white dark:bg-[#1a2632] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Meta do Mês</p>
                            {!editingGoal && (
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {fmt(currentMonthSales)}
                                    <span className="text-slate-400 font-normal"> / {goal > 0 ? fmt(goal) : '—'}</span>
                                </p>
                            )}
                        </div>
                        {isAdmin && (
                            editingGoal ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={goalInput}
                                        onChange={e => setGoalInput(e.target.value)}
                                        placeholder="Ex: 150000"
                                        className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 w-36 dark:bg-[#1e2936] dark:text-white focus:ring-primary focus:border-primary"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
                                    />
                                    <button onClick={handleSaveGoal} className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-bold hover:bg-primary/90">Salvar</button>
                                    <button onClick={() => setEditingGoal(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">✕</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setGoalInput(goal > 0 ? String(goal) : ''); setEditingGoal(true); }}
                                    className="text-[10px] font-bold text-primary hover:underline"
                                >
                                    {goal > 0 ? 'Editar meta' : 'Definir meta'}
                                </button>
                            )
                        )}
                    </div>
                    {goal > 0 && (
                        <>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-700 ${goalProgress >= 100 ? 'bg-emerald-500' : goalProgress >= 70 ? 'bg-primary' : goalProgress >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${goalProgress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">{goalProgress.toFixed(1)}% da meta atingida no mês atual</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Gráficos
// ─────────────────────────────────────────────────────────────────────────────
export const DashboardGraphs: React.FC = () => {
    const { batches, projects, workflowConfig } = useProjects();

    // Funil por estágio (contagem de projetos)
    const funnelData = useMemo(() => {
        const stageCounts: Record<string, number> = {};
        const stageNames: Record<string, string> = {
            1: 'Pré-Venda', 2: 'Venda', 3: 'Medição', 4: 'Executivo',
            5: 'Fabricação', 6: 'Entrega', 7: 'Montagem', 8: 'Pós Montagem', 9: 'Conclusão'
        };
        Object.keys(stageNames).forEach(stage => stageCounts[stage] = 0);
        batches.forEach(batch => {
            const step = workflowConfig[batch.phase];
            if (step && stageCounts[step.stage] !== undefined) stageCounts[step.stage]++;
        });
        return Object.entries(stageCounts).map(([stage, count]) => ({
            name: stageNames[stage] || `Estágio ${stage}`,
            count
        }));
    }, [batches, workflowConfig]);

    // Tendência mensal de vendas (últimos 12 meses)
    const monthlyTrend = useMemo(() => {
        const months: Record<string, number> = {};
        const effectuatedIds = new Set(
            batches
                .filter(b => parseFloat(b.phase) >= 2.9 && b.phase !== '9.1')
                .map(b => b.projectId)
        );
        projects.forEach(project => {
            if (!effectuatedIds.has(project.id)) return;
            const dateStr = project.contractDate || project.created_at;
            const date = new Date(dateStr);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + (project.contractValue || project.total_estimated_value || 0);
        });
        return Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([key, value]) => ({
                month: new Date(key + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                value
            }));
    }, [projects, batches]);

    // Ranking de vendedores
    const sellerRanking = useMemo(() => {
        const data: Record<string, { count: number; value: number }> = {};
        const effectuatedIds = new Set(
            batches
                .filter(b => parseFloat(b.phase) >= 2.9 && b.phase !== '9.1')
                .map(b => b.projectId)
        );
        projects.forEach(project => {
            if (!effectuatedIds.has(project.id)) return;
            const seller = project.sellerName || 'Sem Vendedor';
            if (!data[seller]) data[seller] = { count: 0, value: 0 };
            data[seller].count++;
            data[seller].value += project.contractValue || project.total_estimated_value || 0;
        });
        return Object.entries(data)
            .map(([name, d], i) => ({ name, count: d.count, value: d.value, color: COLORS[i % COLORS.length] }))
            .sort((a, b) => b.value - a.value);
    }, [projects, batches]);

    const totalSellerValue = sellerRanking.reduce((s, r) => s + r.value, 0);

    return (
        <div className="space-y-6 mb-8">
            {/* Tendência Mensal */}
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-800 dark:text-white mb-4">Tendência de Vendas — Últimos 12 Meses</h4>
                {monthlyTrend.length > 0 ? (
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis
                                    tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact', currency: 'BRL', style: 'currency', maximumFractionDigits: 0 }).format(v)}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={72}
                                />
                                <Tooltip
                                    formatter={(v: number) => [fmt(v), 'Vendas']}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: 8, fontSize: 12 }}
                                    itemStyle={{ color: '#c7d2fe' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesGradient)" dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sem dados de vendas ainda.</div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funil de Projetos */}
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h4 className="text-base font-bold text-slate-800 dark:text-white mb-4">Funil de Projetos</h4>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.15)" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: 8, fontSize: 12 }}
                                    itemStyle={{ color: '#a5b4fc' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Projetos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ranking de Vendedores */}
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h4 className="text-base font-bold text-slate-800 dark:text-white mb-4">Ranking de Vendedores</h4>
                    {sellerRanking.length > 0 ? (
                        <div className="space-y-3">
                            {sellerRanking.map((seller, i) => {
                                const pct = totalSellerValue > 0 ? (seller.value / totalSellerValue) * 100 : 0;
                                return (
                                    <div key={seller.name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}º</span>
                                                <span
                                                    className="size-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: seller.color }}
                                                />
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{seller.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                                <span className="text-[10px] text-slate-400">{seller.count} venda{seller.count !== 1 ? 's' : ''}</span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{fmt(seller.value)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: seller.color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm pt-10">Sem dados de vendas ainda.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
