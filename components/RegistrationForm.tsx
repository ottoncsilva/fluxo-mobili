import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Environment, Client } from '../types';
import { maskPhone, maskCPF, maskCEP, unmask } from '../utils/masks';
import { fetchAddressByCEP } from '../utils/cepUtils';

interface RegistrationFormProps {
    onComplete?: (clientId?: string) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete }) => {
    const { addProject, currentUser, origins } = useProjects();
    const [currentStep, setCurrentStep] = useState(1); // 1: Lead, 2: Briefing, 3: Ambientes

    // Address Separation State
    const [addressFields, setAddressFields] = useState({
        cep: '',
        street: '',
        number: '',
        complement: '',
        condominium: '',
        neighborhood: '',
        city: '',
        state: '',
        country: 'Brasil'
    });

    // Consolidated Client State
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        email: '',
        phone: '',
        address: '', // Will be constructed on save
        condominium: '',
        cpf: '',
        rg: '',
        cod_efinance: '', // New field
        origin: origins[0] || 'Indicação',
        consultant_name: currentUser?.name || '',
        briefing_date: new Date().toISOString().split('T')[0],
        sellerId: currentUser?.id || '',

        // Briefing Defaults
        property_type: 'Reforma',
        payment_preference: 'À vista',
        project_has_architect_project: 'Não',

        // Additional Fields based on previous code context
        property_location: '',
        property_area: 0,
        profile_residents: '',
        profile_routine: '',
        profile_pains: '',
        time_move_in: '',
        time_measurement_ready: '',
        time_decision_expectation: '',
        architect_name: '',
        commissioned_specifier: '',
        budget_expectation: 0
    });

    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [envName, setEnvName] = useState('');

    const updateField = (field: keyof Client, value: any) => {
        let formattedValue = value;

        // Apply Masks
        if (field === 'phone') formattedValue = maskPhone(value);
        if (field === 'cpf') formattedValue = maskCPF(value);

        // Special validation for cod_efinance
        if (field === 'cod_efinance') {
            formattedValue = value.replace(/\D/g, '').slice(0, 5);
        }

        setFormData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const updateAddressField = (field: keyof typeof addressFields, value: string) => {
        let formattedValue = value;
        if (field === 'cep') formattedValue = maskCEP(value);

        setAddressFields((prev: typeof addressFields) => {
            const newFields = { ...prev, [field]: formattedValue };
            // Auto-update legacy address field for preview validation if needed
            // But we will construct it on save.
            return newFields;
        });
    };

    const [isSearchingCep, setIsSearchingCep] = useState(false);

    const searchCEP = async () => {
        setIsSearchingCep(true);
        try {
            const address = await fetchAddressByCEP(addressFields.cep);
            if (address === null) {
                alert('CEP não encontrado.');
            } else {
                setAddressFields((prev: typeof addressFields) => ({
                    ...prev,
                    street: address.street,
                    neighborhood: address.neighborhood,
                    city: address.city,
                    state: address.state,
                    country: 'Brasil'
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert((error as Error).message || 'Erro ao buscar CEP. Tente novamente mais tarde.');
        } finally {
            setIsSearchingCep(false);
        }
    };

    const handleAddEnvironment = () => {
        if (!envName.trim()) return;

        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: envName.trim(),
            area_sqm: 0,
            urgency_level: 'Média',
            estimated_value: 0,
            observations: '',
            status: 'Pending'
        };

        setEnvironments([...environments, newEnv]);
        setEnvName('');
    };

    const validateStep1 = () => {
        if (!formData.name || !formData.phone) {
            alert("Por favor, preencha Nome e WhatsApp.");
            return false;
        }

        // Validate Address Fields
        if (!addressFields.street || !addressFields.number || !addressFields.neighborhood || !addressFields.city || !addressFields.state) {
            alert("Por favor, preencha todos os campos do endereço.");
            return false;
        }

        // Validate Cod. EFinance
        if (!formData.cod_efinance || formData.cod_efinance.length !== 5) {
            alert("O Cód. EFinance é obrigatório e deve ter 5 dígitos numéricos.");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.property_type) {
            alert("Por favor, selecione o tipo de imóvel.");
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!validateStep1()) return;
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!validateStep2()) return;
            setCurrentStep(3);
        }
    };

    const handleSave = async () => {
        if (environments.length === 0) {
            alert("Adicione pelo menos um ambiente.");
            return;
        }

        // Construct full address
        const parts = [
            addressFields.street,
            addressFields.number,
            addressFields.complement,
            addressFields.neighborhood,
            addressFields.city,
            addressFields.state,
            addressFields.country,
            `CEP: ${addressFields.cep}`
        ].filter(Boolean); // removes empty parts
        const fullAddress = parts.join(', ');

        const clientData = {
            ...formData,
            condominium: addressFields.condominium, // Store separately as requested for legacy compatibility/easier access
            address: fullAddress
        } as Client;

        try {
            await addProject(clientData, environments);
            alert("Cliente cadastrado com sucesso!");
            if (onComplete) onComplete();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar cliente. Tente novamente.");
        }
    };

    return (
        <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Novo Projeto</h2>

            {/* Stepper */}
            <div className="flex items-center mb-8">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>1</div>
                    <span className="text-sm font-bold">Cliente</span>
                </div>
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>2</div>
                    <span className="text-sm font-bold">Briefing</span>
                </div>
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-primary' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>3</div>
                    <span className="text-sm font-bold">Ambientes</span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    {/* STEP 1: LEAD */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cód. EFinance*</label>
                                    <input
                                        type="text"
                                        value={formData.cod_efinance || ''}
                                        onChange={e => updateField('cod_efinance', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                        placeholder="00000"
                                        maxLength={5}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo*</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('name', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                        placeholder="Ex: Ana Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp*</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('phone', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('email', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
                                    <select
                                        value={formData.origin}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('origin', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                                    >
                                        {origins.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Endereço</h3>
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                                value={addressFields.cep}
                                                onChange={e => updateAddressField('cep', e.target.value)}
                                                placeholder="00000-000"
                                                onBlur={(e) => {
                                                    if (unmask(e.target.value).length === 8) {
                                                        searchCEP();
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={searchCEP}
                                                disabled={isSearchingCep}
                                                className="px-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center disabled:opacity-50"
                                                title="Buscar CEP"
                                            >
                                                {isSearchingCep ? (
                                                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-sm">search</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço (Rua/Av)*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.street}
                                            onChange={e => updateAddressField('street', e.target.value)}
                                            placeholder="Ex: Av. Paulista"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.number}
                                            onChange={e => updateAddressField('number', e.target.value)}
                                            placeholder="123"
                                        />
                                    </div>

                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.complement}
                                            onChange={e => updateAddressField('complement', e.target.value)}
                                            placeholder="Ex: Apto 101, Bloco B"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Condomínio</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.condominium}
                                            onChange={e => updateAddressField('condominium', e.target.value)}
                                            placeholder="Condomínio..."
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.neighborhood}
                                            onChange={e => updateAddressField('neighborhood', e.target.value)}
                                        />
                                    </div>

                                    <div className="col-span-12 md:col-span-5">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.city}
                                            onChange={e => updateAddressField('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.state}
                                            onChange={e => updateAddressField('state', e.target.value)}
                                            placeholder="Ex: SP"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">País*</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                            value={addressFields.country}
                                            onChange={e => updateAddressField('country', e.target.value)}
                                            placeholder="Brasil"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: BRIEFING */}
                    {currentStep === 2 && (
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
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Perfil e Necessidades (Briefing)</h3>
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
                    )}

                    {/* STEP 3: AMBIENTES (Simplified) */}
                    {currentStep === 3 && (
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
                    )}
                </div>
            </div >

            {/* Action Footer */}
            < div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex items-center justify-between" >
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
    );
};

export default RegistrationForm;