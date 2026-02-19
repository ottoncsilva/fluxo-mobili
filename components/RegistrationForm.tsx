import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Environment, Client } from '../types';

interface RegistrationFormProps {
    onComplete?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete }) => {
    const { addProject, currentUser, origins, allUsers, permissions } = useProjects();
    const [currentStep, setCurrentStep] = useState(1); // 1: Lead, 2: Briefing (ITPP), 3: Ambientes

    // Consolidated Client State
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        email: '',
        phone: '',
        address: '',
        condominium: '',
        cpf: '',
        rg: '',
        cod_efinance: '', // New field
        origin: origins[0] || 'Indicação',
        consultant_name: currentUser?.name || '',
        briefing_date: new Date().toISOString().split('T')[0],
        sellerId: currentUser?.id || '',

        // ITPP Defaults
        property_type: 'Reforma',
        payment_preference: 'À vista',
        project_has_architect_project: 'Não'
    });

    // ... (rest of state)

    const updateField = (field: keyof Client, value: any) => {
        // Special validation for cod_efinance
        if (field === 'cod_efinance') {
            // Only allow numbers and max 5 digits
            const numericValue = value.replace(/\D/g, '').slice(0, 5);
            setFormData(prev => ({ ...prev, [field]: numericValue }));
            return;
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // ... (rest of functions)

    const validateStep1 = () => {
        if (!formData.name || !formData.phone || !formData.address) {
            alert("Por favor, preencha Nome, WhatsApp e Endereço.");
            return false;
        }
        // Validate Cod. EFinance
        if (!formData.cod_efinance || formData.cod_efinance.length !== 5) {
            alert("O Cód. EFinance é obrigatório e deve ter 5 dígitos numéricos.");
            return false;
        }
        return true;
    }

    // ... (rest of validation)

    // ... (render)
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cód. EFinance *</label>
                                    <input
                                        type="text"
                                        value={formData.cod_efinance || ''}
                                        onChange={e => updateField('cod_efinance', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary font-mono tracking-widest"
                                        placeholder="00000"
                                        maxLength={5}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Código único do cliente (5 dígitos)</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => updateField('name', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                        placeholder="Ex: Ana Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">WhatsApp / Telefone *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => updateField('phone', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">E-mail</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => updateField('email', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">CPF</label>
                                        <input
                                            type="text"
                                            value={formData.cpf}
                                            onChange={e => updateField('cpf', e.target.value)}
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">RG</label>
                                        <input
                                            type="text"
                                            value={formData.rg}
                                            onChange={e => updateField('rg', e.target.value)}
                                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                            placeholder="00.000.000-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Endereço Completo *</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={e => updateField('address', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                        rows={3}
                                        placeholder="Rua, Número, Bairro, Cidade..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Condomínio</label>
                                    <input
                                        type="text"
                                        value={formData.condominium}
                                        onChange={e => updateField('condominium', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                        placeholder="Nome do Condomínio (se houver)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Origem do Cliente</label>
                                    <select
                                        value={formData.origin}
                                        onChange={e => updateField('origin', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                    >
                                        {origins.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div >
                    )}

{/* STEP 2: BRIEFING (Consolidated ITPP) */ }
{
    currentStep === 2 && (
        <div className="space-y-8">

            {/* Imóvel (Mandatory Section) */}
            <div>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                    <span className="size-6 rounded bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">I</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dados do Imóvel (Obrigatório)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Projeto *</label>
                        <div className="flex gap-4">
                            {['Reforma', 'Construção Nova'].map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="propType"
                                        checked={formData.property_type === opt}
                                        onChange={() => updateField('property_type', opt)}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Localização (Bairro/Cidade) *</label>
                        <input
                            type="text"
                            value={formData.property_location}
                            onChange={e => updateField('property_location', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Área Aprox. (m²)</label>
                            <input
                                type="number"
                                value={formData.property_area}
                                onChange={e => updateField('property_area', Number(e.target.value))}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>

            {/* Perfil & Necessidades */}
            <div>
                <div className="pb-2 mb-4 flex items-center gap-2">
                    <span className="size-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">P</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Perfil e Necessidades (ITPP)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quem utilizará os ambientes?</label>
                        <input
                            type="text"
                            value={formData.profile_residents}
                            onChange={e => updateField('profile_residents', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                            placeholder="Ex: Casal com filhos, pessoa que mora sozinha..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Qual a rotina principal da casa?</label>
                        <textarea
                            value={formData.profile_routine}
                            onChange={e => updateField('profile_routine', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Principais "dores" ou expectativas?</label>
                        <textarea
                            value={formData.profile_pains}
                            onChange={e => updateField('profile_pains', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Tempo */}
            <div>
                <div className="pb-2 mb-4 flex items-center gap-2">
                    <span className="size-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">T</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tempo e Prazos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Previsão de Mudança</label>
                        <input
                            type="date"
                            value={formData.time_move_in}
                            onChange={e => updateField('time_move_in', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pronto p/ medição?</label>
                        <input
                            type="text"
                            value={formData.time_measurement_ready}
                            onChange={e => updateField('time_measurement_ready', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Expectativa Fechamento</label>
                        <input
                            type="text"
                            value={formData.time_decision_expectation}
                            onChange={e => updateField('time_decision_expectation', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        />
                    </div>
                </div>
            </div>

            {/* Projeto e Parcerias */}
            <div>
                <div className="pb-2 mb-4 flex items-center gap-2">
                    <span className="size-6 rounded bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">P</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Projeto e Parcerias</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Projeto de Arquiteto?</label>
                        <div className="flex flex-col gap-2">
                            {['Sim', 'Não', 'Cliente Irá Fornecer'].map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="archProj"
                                        checked={formData.project_has_architect_project === opt}
                                        onChange={() => updateField('project_has_architect_project', opt)}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nome do Arquiteto</label>
                        <input
                            type="text"
                            value={formData.architect_name}
                            onChange={e => updateField('architect_name', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                            placeholder="Se houver"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Especificador Comissionado (RT)</label>
                        <input
                            type="text"
                            value={formData.commissioned_specifier}
                            onChange={e => updateField('commissioned_specifier', e.target.value)}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                            placeholder="Nome do profissional parceiro"
                        />
                    </div>
                </div>
            </div>

            {/* Preço (Optional at this stage) */}
            <div>
                <div className="pb-2 mb-4 flex items-center gap-2">
                    <span className="size-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">P</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Orçamento (Estimativa)</h3>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Orçamento disponível (Estimativa R$)</label>
                    <input
                        type="number"
                        value={formData.budget_expectation}
                        onChange={e => updateField('budget_expectation', Number(e.target.value))}
                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-lg font-medium text-emerald-600"
                    />
                </div>
            </div>
        </div>
    )
}

{/* STEP 3: AMBIENTES (Simplified) */ }
{
    currentStep === 3 && (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Definição de Escopo</h3>
                    <p className="text-sm text-slate-500">Adicione os ambientes que serão projetados.</p>
                </div>
            </div>

            {/* Add Form */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Ambiente</label>
                    <input
                        type="text"
                        value={envName}
                        onChange={e => setEnvName(e.target.value)}
                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        placeholder="Ex: Cozinha, Home Theater..."
                    />
                </div>
                <button
                    onClick={handleAddEnvironment}
                    className="bg-primary text-white px-4 py-2.5 rounded-lg font-bold hover:bg-primary-600 flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Adicionar
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {environments.length === 0 ? (
                    <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                        Nenhum ambiente adicionado ao escopo.
                    </div>
                ) : (
                    environments.map((env, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                    {i + 1}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{env.name}</h4>
                                </div>
                            </div>
                            <button
                                onClick={() => setEnvironments(prev => prev.filter(e => e.id !== env.id))}
                                className="text-rose-400 hover:text-rose-600 p-2"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
                </div >

    {/* Action Footer */ }
    < div className = "mt-6 flex justify-between items-center bg-white dark:bg-[#1a2632] p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 sticky bottom-0 z-20 shrink-0" >
                    <button
                        onClick={() => { if (currentStep > 1) setCurrentStep(prev => prev - 1) }}
                        className={`px-6 py-2.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${currentStep === 1 ? 'invisible' : ''}`}
                    >
                        Voltar
                    </button>

                    <div className="flex gap-4">
                        {currentStep < 3 ? (
                            <button
                                onClick={handleNext}
                                className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                className="px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-600 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">rocket_launch</span>
                                Finalizar Cadastro
                            </button>
                        )}
                    </div>
                </div >
            </div >
        </div >
    );
};

export default RegistrationForm;