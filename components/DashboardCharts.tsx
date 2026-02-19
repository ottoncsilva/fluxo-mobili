import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useProjects } from '../context/ProjectContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const DashboardCharts: React.FC = () => {
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

        // Initialize counts
        Object.keys(stageNames).forEach(stage => stageCounts[stage] = 0);

        batches.forEach(batch => {
            const step = workflowConfig[batch.currentStepId];
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
            // Consider "Sold" if status is Concluido or check Batches for 9.0?
            // For now, let's sum ALL potentials or just won?
            // Usually "Sales by Seller" implies closed deals.
            // Let's check client status 'Concluido' OR if the project has a batch in 9.0

            // Check if project is completed (won)
            const isWon = project.client.status === 'Concluido';

            // OR check if associated batch is 9.0
            const projectBatch = batches.find(b => b.projectId === project.id);
            const isDelivered = projectBatch?.currentStepId === '9.0';

            if (isWon || isDelivered) {
                const seller = project.sellerName || 'Sem Vendedor';
                const value = project.total_estimated_value || 0;
                sales[seller] = (sales[seller] || 0) + value;
            }
        });

        return Object.entries(sales).map(([name, value]) => ({ name, value }));
    }, [projects, batches]);

    const kpiData = useMemo(() => {
        const totalSales = salesBySeller.reduce((acc, curr) => acc + curr.value, 0);

        let activeProjects = 0;
        batches.forEach(b => {
            if (b.currentStepId !== '9.0' && b.currentStepId !== '9.1') {
                activeProjects++;
            }
        });

        const totalProjects = projects.length;
        const wonProjects = projects.filter(p => p.client.status === 'Concluido').length + batches.filter(b => b.currentStepId === '9.0').length;
        // Note: Avoiding double count if both true is tricky without ID checks, but simple approximation:
        // Let's stick to unique ID check if needed, but for KPI standard:

        const uniqueWonIds = new Set([
            ...projects.filter(p => p.client.status === 'Concluido').map(p => p.id),
            ...batches.filter(b => b.currentStepId === '9.0').map(b => b.projectId)
        ]);

        const conversionRate = totalProjects > 0 ? ((uniqueWonIds.size / totalProjects) * 100).toFixed(1) : 0;

        return { totalSales, activeProjects, conversionRate };
    }, [salesBySeller, batches, projects]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* KPI Overview (Integrated here or kept in parent? Parent has basic task stats, these are business KPIs) */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Volume de Vendas</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpiData.totalSales)}
                    </h3>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Projetos Ativos</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpiData.activeProjects}</h3>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Taxa de Conversão</p>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{kpiData.conversionRate}%</h3>
                </div>
            </div>

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
