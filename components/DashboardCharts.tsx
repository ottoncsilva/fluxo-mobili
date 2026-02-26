import React, { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useProjects } from '../context/ProjectContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

export const DashboardKPIs: React.FC = () => {
    const { batches, projects } = useProjects();
    const [period, setPeriod] = useState<TimePeriod>('month');

    const kpiData = useMemo(() => {
        const boundary = getDateBoundary(period);
        const filteredProjects = boundary
            ? projects.filter(p => new Date(p.created_at) >= boundary)
            : projects;

        const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
        const filteredBatches = batches.filter(b => filteredProjectIds.has(b.projectId));

        let activeProjects = 0;
        filteredBatches.forEach(b => {
            if (b.phase !== '9.0' && b.phase !== '9.1') {
                activeProjects++;
            }
        });

        // Venda efetivada = projeto chegou na etapa 2.9 (Contrato e Detalhamento), excluindo perdidos (9.1)
        const effectuatedSales = filteredBatches.filter(b => {
            const stepNum = parseFloat(b.phase);
            return stepNum >= 2.9 && b.phase !== '9.1';
        });
        const effectuatedIds = new Set(effectuatedSales.map(b => b.projectId));

        const totalSales = filteredProjects.reduce((acc, p) => {
            if (!effectuatedIds.has(p.id)) return acc;
            // Usa o valor do contrato assinado; se ainda não definido, usa o estimado
            return acc + (p.contractValue || p.total_estimated_value || 0);
        }, 0);

        const effectuatedCount = effectuatedSales.length;

        // Taxa de conversão: vendas efetivadas vs projetos elegíveis (excluindo perdidos)
        const eligibleCount = filteredBatches.filter(b => b.phase !== '9.1').length;
        const conversionRate = eligibleCount > 0 ? ((effectuatedCount / eligibleCount) * 100).toFixed(1) : '0.0';

        const totalInPeriod = filteredProjects.length;

        return { totalSales, activeProjects, conversionRate, totalInPeriod, effectuatedCount };
    }, [batches, projects, period]);

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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Volume de Vendas</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpiData.totalSales)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{kpiData.effectuatedCount} venda{kpiData.effectuatedCount !== 1 ? 's' : ''} efetivada{kpiData.effectuatedCount !== 1 ? 's' : ''} (etapa 2.9+)</p>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Projetos Ativos</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpiData.activeProjects}</h3>
                    <p className="text-xs text-slate-400 mt-1">{kpiData.totalInPeriod} projetos no período</p>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Taxa de Conversão</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpiData.conversionRate}%</h3>
                    <p className="text-xs text-slate-400 mt-1">Projetos efetivados vs elegíveis no período</p>
                </div>
            </div>
        </div>
    );
};

export const DashboardGraphs: React.FC = () => {
    const { batches, projects, workflowConfig } = useProjects();

    const funnelData = useMemo(() => {
        const stageCounts: Record<string, number> = {};
        const stageNames: Record<string, string> = {
            1: 'Pré-Venda',
            2: 'Venda',
            3: 'Medição',
            4: 'Executivo',
            5: 'Fabricação',
            6: 'Entrega',
            7: 'Montagem',
            8: 'Pós Montagem',
            9: 'Conclusão'
        };

        Object.keys(stageNames).forEach(stage => stageCounts[stage] = 0);

        batches.forEach(batch => {
            const step = workflowConfig[batch.phase];
            if (step) {
                if (stageCounts[step.stage] !== undefined) {
                    stageCounts[step.stage]++;
                }
            }
        });

        return Object.entries(stageCounts).map(([stage, count]) => ({
            name: stageNames[stage] || `Estágio ${stage}`,
            count
        }));
    }, [batches, workflowConfig]);

    const salesBySeller = useMemo(() => {
        const sales: Record<string, number> = {};

        projects.forEach(project => {
            const projectBatch = batches.find(b => b.projectId === project.id);
            if (!projectBatch) return;
            const stepNum = parseFloat(projectBatch.phase);
            // Venda efetivada ao chegar na etapa 2.9 (Contrato e Detalhamento)
            const isSaleEffectuated = stepNum >= 2.9 && projectBatch.phase !== '9.1';

            if (isSaleEffectuated) {
                const seller = project.sellerName || 'Sem Vendedor';
                const value = project.contractValue || project.total_estimated_value || 0;
                sales[seller] = (sales[seller] || 0) + value;
            }
        });

        return Object.entries(sales).map(([name, value]) => ({ name, value }));
    }, [projects, batches]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Funnel Chart */}
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px]">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Funil de Projetos</h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} name="Projetos" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sales by Seller Chart */}
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px]">
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Vendas por Vendedor</h4>
                <div className="h-[300px] w-full flex justify-center">
                    {salesBySeller.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesBySeller}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {salesBySeller.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Sem dados de vendas ainda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

