import React, { useState, useEffect } from 'react';
import { Project, Batch, Client, Environment, User, CompanySettings } from '../types';
import { useProjects } from '../context/ProjectContext';

interface ContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

interface PaymentParcel {
    id: string;
    dueDate: string;
    method: 'Transferência' | 'Boleto' | 'Cartão de Crédito' | 'Pix' | 'Cheque' | 'Dinheiro';
    document?: string;
    value: number;
}

const ContractModal: React.FC<ContractModalProps> = ({ isOpen, onClose, project }) => {
    const { currentUser, companySettings } = useProjects();
    const [step, setStep] = useState<'EDIT' | 'PREVIEW'>('EDIT');

    // Form Data
    const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryDeadlineDays, setDeliveryDeadlineDays] = useState(60);

    // Items (Default to environments)
    const [items, setItems] = useState<{ id: string, name: string, value: number, included: boolean }[]>([]);

    // Payment
    const [totalValue, setTotalValue] = useState(0);
    const [parcels, setParcels] = useState<PaymentParcel[]>([]);

    // Load initial data
    useEffect(() => {
        if (isOpen && project) {
            const initialItems = project.environments.map(env => ({
                id: env.id,
                name: env.name,
                value: env.final_value || env.estimated_value || 0,
                included: env.status !== 'Lost'
            }));
            setItems(initialItems);

            const total = initialItems.filter(i => i.included).reduce((acc, item) => acc + item.value, 0);
            setTotalValue(total);

            // Default 1 parcel if none exist
            if (parcels.length === 0) {
                setParcels([{
                    id: '1',
                    dueDate: new Date().toISOString().split('T')[0],
                    method: 'Transferência',
                    value: total
                }]);
            }
        }
    }, [isOpen, project]);

    const handlePrint = () => {
        window.print();
    };

    const handleFormalize = () => {
        // Find matched environments to assign them the final values and statuses
        const finalEnvironments = project.environments.map(env => {
            const itemMatch = items.find(i => i.id === env.id);
            if (itemMatch) {
                return {
                    ...env,
                    name: itemMatch.name,
                    final_value: itemMatch.value,
                    estimated_value: itemMatch.value,
                    status: (itemMatch.included ? env.status : 'Lost') as Environment['status']
                };
            }
            return env;
        });

        // Use any to bypass TS context missing if it wasn't refreshed, but it will work
        (useProjects() as any).formalizeContract?.(project.id, finalEnvironments, totalValue, contractDate);
        onClose();
    };


    if (!isOpen || !project) return null;

    const company = companySettings || {
        name: 'Empresa Modelo',
        corporateName: 'Razão Social Modelo',
        cnpj: '00.000.000/0001-00',
        address: 'Endereço da Empresa',
        phone: '(00) 0000-0000'
    } as CompanySettings;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const renderEditor = () => (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 1. Valores e Itens */}
                <section>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-600 size-6 rounded-full flex items-center justify-center text-sm">1</span>
                        Itens e Valores
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        {items.map((item, index) => (
                            <div key={item.id} className={`flex gap-4 items-center ${!item.included ? 'opacity-50' : ''}`}>
                                <span className="font-bold text-slate-400 w-6">#{index + 1}</span>
                                <button
                                    onClick={() => {
                                        const newItems = [...items];
                                        newItems[index].included = !newItems[index].included;
                                        setItems(newItems);
                                        setTotalValue(newItems.filter(i => i.included).reduce((acc, i) => acc + i.value, 0));
                                    }}
                                    className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${item.included ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                                >
                                    {item.included && <span className="material-symbols-outlined text-[16px]">check</span>}
                                </button>
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index].name = e.target.value;
                                        setItems(newItems);
                                    }}
                                    className="flex-1 rounded border-slate-300 text-sm"
                                    placeholder="Nome do Ambiente"
                                    disabled={!item.included}
                                />
                                <input
                                    type="number"
                                    value={item.value}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index].value = Number(e.target.value);
                                        setItems(newItems);
                                        setTotalValue(newItems.filter(i => i.included).reduce((acc, i) => acc + i.value, 0));
                                    }}
                                    className="w-32 rounded border-slate-300 text-sm"
                                    placeholder="0,00"
                                    disabled={!item.included}
                                />
                                <button
                                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => setItems([...items, { id: `new-${Date.now()}`, name: '', value: 0, included: true }])}
                            className="text-sm text-emerald-600 font-bold hover:underline"
                        >
                            + Adicionar Item
                        </button>

                        <div className="border-t border-slate-200 mt-4 pt-4 flex justify-end items-center gap-4">
                            <span className="font-bold text-slate-600">Total do Contrato:</span>
                            <span className="text-xl font-bold text-slate-800">{formatCurrency(totalValue)}</span>
                        </div>
                    </div>
                </section>

                {/* 2. Pagamento */}
                <section>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-600 size-6 rounded-full flex items-center justify-center text-sm">2</span>
                        Forma de Pagamento
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        {parcels.map((parcel, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-white p-3 rounded border border-slate-200">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Vencimento</label>
                                    <input
                                        type="date"
                                        value={parcel.dueDate}
                                        onChange={(e) => {
                                            const newParcels = [...parcels];
                                            newParcels[index].dueDate = e.target.value;
                                            setParcels(newParcels);
                                        }}
                                        className="w-full rounded border-slate-300 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Forma</label>
                                    <select
                                        value={parcel.method}
                                        onChange={(e) => {
                                            const newParcels = [...parcels];
                                            newParcels[index].method = e.target.value as any;
                                            setParcels(newParcels);
                                        }}
                                        className="w-full rounded border-slate-300 text-sm"
                                    >
                                        <option>Transferência</option>
                                        <option>Boleto</option>
                                        <option>Cartão de Crédito</option>
                                        <option>Pix</option>
                                        <option>Cheque</option>
                                        <option>Dinheiro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400">Valor</label>
                                    <input
                                        type="number"
                                        value={parcel.value}
                                        onChange={(e) => {
                                            const newParcels = [...parcels];
                                            newParcels[index].value = Number(e.target.value);
                                            setParcels(newParcels);
                                        }}
                                        className="w-full rounded border-slate-300 text-sm"
                                    />
                                </div>
                                <div className="flex items-end justify-end h-full pt-4">
                                    <button
                                        onClick={() => setParcels(parcels.filter((_, i) => i !== index))}
                                        className="text-red-400 hover:text-red-600 p-2"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setParcels([...parcels, { id: `p-${Date.now()}`, dueDate: '', method: 'Transferência', value: 0 }])}
                            className="text-sm text-emerald-600 font-bold hover:underline"
                        >
                            + Adicionar Parcela
                        </button>
                    </div>
                </section>

                {/* 3. Configurações Gerais */}
                <section>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-600 size-6 rounded-full flex items-center justify-center text-sm">3</span>
                        Detalhes do Contrato
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Data do Contrato</label>
                            <input
                                type="date"
                                value={contractDate}
                                onChange={(e) => setContractDate(e.target.value)}
                                className="w-full rounded border-slate-300 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Prazo de Entrega (Dias Úteis)</label>
                            <input
                                type="number"
                                value={deliveryDeadlineDays}
                                onChange={(e) => setDeliveryDeadlineDays(Number(e.target.value))}
                                className="w-full rounded border-slate-300 text-sm"
                            />
                        </div>
                    </div>
                </section>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 rounded-b-xl">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded">Cancelar</button>
                <button
                    onClick={() => setStep('PREVIEW')}
                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                    Gerar Minuta
                </button>
            </div>
        </div>
    );

    const renderPreview = () => (
        <div className="flex flex-col h-full bg-slate-500/50">
            {/* Preview Toolbar */}
            <div className="bg-white p-4 shadow-md z-10 flex justify-between items-center print:hidden">
                <button onClick={() => setStep('EDIT')} className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Voltar e Editar
                </button>
                <h2 className="font-bold text-slate-800">Visualização de Impressão</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-slate-200 text-slate-700 px-6 py-2 rounded font-bold hover:bg-slate-300 shadow"
                    >
                        <span className="material-symbols-outlined">print</span>
                        Imprimir / PDF
                    </button>
                    <button
                        onClick={handleFormalize}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700 shadow-lg"
                    >
                        <span className="material-symbols-outlined">verified</span>
                        Formalizar Contrato
                    </button>
                </div>
            </div>

            {/* Contract "Paper" */}
            <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible flex justify-center">
                <div className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl print:shadow-none print:w-full text-[10pt] leading-relaxed text-justify font-serif text-black">

                    {/* Header */}
                    <div className="mb-8 border-b-2 border-slate-300 pb-4 flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold uppercase mb-1">{company.corporateName}</h1>
                            <p className="text-sm">{company.cnpj}</p>
                            <p className="text-sm">{company.address}</p>
                            <p className="text-sm">{company.phone}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-lg font-bold">CONTRATO DE COMPRA E VENDA</h2>
                            <p className="font-bold">PV-{project.id.slice(-6).toUpperCase()}</p>
                            <p>Versão: 1</p>
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="mb-6">
                        <h3 className="font-bold uppercase mb-2 bg-slate-100 p-1 print:bg-transparent print:border-b print:border-black">Contratante</h3>
                        <p>
                            <strong>Nome:</strong> {project.client.name}<br />
                            <strong>CPF:</strong> {project.client.cpf || 'Não informado'} | <strong>RG:</strong> {project.client.rg || 'Não informado'}<br />
                            <strong>Endereço:</strong> {project.client.address || 'Não informado'} {project.client.condominium ? `- ${project.client.condominium}` : ''}<br />
                            <strong>Telefone:</strong> {project.client.phone || 'Não informado'} | <strong>Email:</strong> {project.client.email || 'Não informado'}
                        </p>
                    </div>

                    <p className="mb-4">
                        As partes acima identificadas têm, entre si, justas e acertadas pelo presente <strong>Contrato de Compra e Venda de Produtos de bens duráveis</strong>,
                        que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.
                    </p>

                    {/* Valor e Itens */}
                    <div className="mb-6">
                        <h3 className="font-bold uppercase mb-2 bg-slate-100 p-1 print:bg-transparent print:border-b print:border-black">Objeto do Contrato (Bens Móveis)</h3>
                        <table className="w-full border-collapse border border-slate-300 text-xs mb-2">
                            <thead>
                                <tr className="bg-slate-100 print:bg-transparent">
                                    <th className="border border-slate-300 p-1 text-left">Item</th>
                                    <th className="border border-slate-300 p-1 text-left">Ambiente</th>
                                    <th className="border border-slate-300 p-1 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="border border-slate-300 p-1">{i + 1}</td>
                                        <td className="border border-slate-300 p-1">{item.name}</td>
                                        <td className="border border-slate-300 p-1 text-right">{formatCurrency(item.value)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={2} className="border border-slate-300 p-1 font-bold text-right">TOTAL</td>
                                    <td className="border border-slate-300 p-1 font-bold text-right bg-slate-50 print:bg-transparent">{formatCurrency(totalValue)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagamento */}
                    <div className="mb-6">
                        <h3 className="font-bold uppercase mb-2 bg-slate-100 p-1 print:bg-transparent print:border-b print:border-black">Condições de Pagamento</h3>
                        <table className="w-full border-collapse border border-slate-300 text-xs">
                            <thead>
                                <tr className="bg-slate-100 print:bg-transparent">
                                    <th className="border border-slate-300 p-1 text-left">Parcela</th>
                                    <th className="border border-slate-300 p-1 text-left">Vencimento</th>
                                    <th className="border border-slate-300 p-1 text-left">Forma</th>
                                    <th className="border border-slate-300 p-1 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parcels.map((p, i) => (
                                    <tr key={i}>
                                        <td className="border border-slate-300 p-1">{i + 1}</td>
                                        <td className="border border-slate-300 p-1">{formatDate(p.dueDate)}</td>
                                        <td className="border border-slate-300 p-1">{p.method}</td>
                                        <td className="border border-slate-300 p-1 text-right">{formatCurrency(p.value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cláusulas Completas */}
                    <div className="text-[10px] space-y-4 text-justify print:text-black font-sans leading-tight">
                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA PRIMEIRA - PARTES CONTRATANTES</h4>
                            <p>
                                1.1 O CONTRATANTE, conforme descrito no pedido anexo, que integra e possui o mesmo número deste CONTRATO DE COMPRA E VENDA DE PRODUTOS E DE PRESTAÇÃO DE SERVIÇOS, na melhor forma de direito, contrata em caráter irrevogável e irretratável a empresa <strong>{company.corporateName}</strong>, pessoa jurídica de direito privado, cessionária exclusiva da marca <strong>{company.name}</strong>, com sede a {company.address}, inscrita no CNPJ {company.cnpj}, doravante denominada simplesmente CONTRATADA, para vender e faturar diretamente em nome do CONTRATANTE os produtos descritos no pedido supracitado e os serviços pertinentes, conforme cláusulas e condições abaixo descritas.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA SEGUNDA - OBJETO E PREÇO</h4>
                            <p>
                                2.1 O CONTRATANTE através dos pagamentos descritos no pedido anexo, integrante deste contrato, e providências contratuais complementares também constantes no presente contrato, receberá os produtos descritos e de fabricação das empresas mencionadas no pedido supracitado bem como a prestação dos serviços pertinentes, de acordo com os projetos anexos, os quais, vistados pelas partes, integram e constituem compromissos únicos deste contrato.
                            </p>
                            <p>
                                2.2 <strong>SERVIÇOS:</strong> Descoberta e interpretação das necessidades, através da demonstração de produtos na loja, orientação técnica e comercial, desenvolvimento de projetos, conferência das medidas do local de instalação dos produtos, fornecimento de acessórios, entrega e instalação, desde a pré-venda até a conclusão de instalação conforme projetos integrantes deste contrato.
                            </p>
                            <p>
                                2.3 Pela prestação de serviços e fornecimento de materiais ora contratados o CONTRATANTE PAGARÁ a CONTRATADA o valor descrito no anexo, integrante deste contrato.
                            </p>
                            <p>
                                2.4 Não integram o presente contrato, o fornecimento de elementos decorativos, presentes nos projetos apenas a título de ilustração, tais como eletrodomésticos, granitos, tapetes, cortinas, espelhos, vidros, etc.
                            </p>
                            <p>
                                2.5 Não farão parte do objeto deste contrato e nem será encargo da CONTRATADA a instalação ou alteração de pontos elétricos ou hidráulicos, ou qualquer outra atividade não concretamente relacionada no pedido ou adendo deste instrumento.
                            </p>
                            <p>
                                2.6 Caso o projeto final venha a ser modificado durante sua execução a pedido do CONTRATANTE, de forma que implique diferença de preços do valor pré acordado no pedido desse contrato, haverá ajustes pré-definidos entre as duas partes para sanar a diferença de valores que seguirão tabela de reajustes de acordo com a data em questão. Em caso de medição menor do já efetivamente pago, a diferença será restituída ao CONTRATANTE em forma de crédito para novas compras ou adequação de projetos.
                            </p>
                            <p>
                                2.7 É de inteira responsabilidade do CONTRATANTE a instalação dos eletrodomésticos que porventura estejam integrados ao objeto deste contrato.
                            </p>
                            <p>
                                2.8 A CONTRATADA não assumirá quaisquer responsabilidades pela perda de prazo de instalação de qualquer equipamento eletrodoméstico em geral ou acessório, a não ser que a CONTRATADA tenha dado causa desse eventual atraso.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA TERCEIRA - CONDIÇÕES DE FORNECIMENTO E GARANTIA</h4>
                            <p>
                                3.1 Após a assinatura deste contrato pelo CONTRATANTE, as partes se obrigam ao cumprimento do presente contrato de forma irrevogável e irretratável, sendo vedado o cancelamento da venda por desistência ou arrependimento de qualquer das partes, nos termos do parágrafo 2º do artigo 40 do Código de Defesa do Consumidor.
                            </p>
                            <p>
                                3.2 A medição técnica só será liberada mediante a entrega de toda a documentação pertinente ao projeto como: Eletros, camas, metais, louças e demais itens que possam impactar no processo da conferência técnica.
                            </p>
                            <p>
                                3.3 Os produtos comprados serão entregues e os serviços de instalação executados pela CONTRATADA. Devendo os produtos serem entregues no prazo de <strong>{deliveryDeadlineDays} Dias Úteis</strong> partir da data de assinatura do memorial executivo, sendo que os serviços de instalação serão iniciados em até 05 Dias Úteis da confirmação da entrega dos móveis no local. Caso seja constatado que algum componente tenha sofrido avaria durante o transporte ou durante a instalação, o mesmo será substituído ou reparado em até 20 dias úteis a partir da constatação do fato.
                            </p>
                            <p>
                                3.4 O prazo para a entrega das orientações de pontos hidráulicos/ elétricos é de até 3 Dias Úteis a partir da medição. Quando não houver necessidade de orientação técnica o prazo para a entrega do memorial executivo é de 10 DIAS ÚTEIS. As imagens dos projetos anexados ao contrato são enviados por e-mail ao CONTRATANTE, em até 5 Dias Úteis após a data de efetivação do mesmo.
                            </p>
                            <p>
                                3.5 É de responsabilidade do CONTRATANTE deixar o local de entrega disponível para receber os produtos e nas condições necessárias à realização da instalação, livre e sem ocorrência de obras civis de qualquer modo, assim como a presença de energia elétrica e boa iluminação dos ambientes; fornecimento das plantas hidráulicas e elétricas no início da instalação. A segunda demão de tinta deve ser aplicada após a finalização de todas as instalações.
                            </p>
                            <p>
                                3.6 Quando houver a necessidade de confecção de algum produto que não seja possível ser transportado até o local de instalação, os custos do içamento desses produtos devem ser do CONTRATANTE. Devendo esse serviço ser realizado por empresas especializadas, com seguro, seguindo-se as normas e leis recorrentes.
                            </p>
                            <p>
                                3.7 Na indisponibilidade de entrega e instalação na data estabelecida no presente contrato, o CONTRATANTE deverá informar a previsão para entrega do produto. Nesse caso a nova data de entrega e instalação deverá respeitar a programação logística da CONTRATADA.
                            </p>
                            <p>
                                3.8 A perfeita execução do projeto requer, durante a instalação, alguns ajustes de acabamento que poderão provocar resíduos e pó. Além disso, as embalagens dos produtos após abertos geram volumes que ocupam espaços consideráveis. Após a conclusão da instalação, nossos técnicos estarão aptos a deslocá-los para locais previamente indicados pelo CONTRATANTE e farão a limpeza dos resíduos resultantes da instalação. Quando não houver espaço ideal para o descarte ecológico dos resíduos dessa operação, é de responsabilidade da CONTRATADA a coleta e destinação.
                            </p>
                            <p>
                                3.9 Constituem obrigações da CONTRATADA: a) atender, dentro dos prazos convencionados, no que diz respeito à entrega e instalação dos bens, objeto deste instrumento, bem como, prestar assistência técnica decorrente de defeitos de fabricação; b) Executar a instalação dos produtos dentro da melhor técnica e zelo, obedecendo aos parâmetros de qualidade; c) Providenciar a substituição dos bens ou partes com defeito de fabricação ou decorrente do processo de transporte ou instalação.
                            </p>
                            <p>
                                3.10 A CONTRATADA se exime de qualquer responsabilidade referente a) Existência no local da instalação de sobras de construção civil que possam vir a danificar os produtos; b) Existência de desníveis de grandes proporções, assim como fragilidade de paredes que receberão os produtos; c) Ocorrência de focos de umidade constante e excessiva exposição ao sol, além da possível infestação por insetos.
                            </p>
                            <p>
                                3.11 Os produtos possuem garantia contra eventuais defeitos aparentes e de fácil constatação, oriundos de fábrica, pelo prazo de 90 (noventa) dias a contar da efetiva entrega e emissão da Nota Fiscal. Garantia extra conforme o componente do produto, pelos prazos seguintes: 07 (sete) anos de garantia para o móvel; 05 (cinco) anos para dobradiças e corrediças; 03 (três) anos para puxadores e estruturas metálicas e 01 (um) ano para todos os itens de iluminação, vidros, espelhos, aramados e tapeçaria.
                            </p>
                            <p>
                                3.12 São causas de exclusão da garantia: Utilização dos produtos em condições anormais de uso (tais como sobrecarga de peso, incidência de fogo, infiltrações de líquidos, utilização de produtos abrasivos para limpeza, maresia, ferrugem, fungos, cupins, brocas e outros, por serem oriundos de agentes externos), a montagem ou desmontagem dos produtos por pessoas não credenciadas pela CONTRATADA e defeitos oriundos pela falta de manutenção periódica.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA QUARTA – PAGAMENTOS</h4>
                            <p>
                                4.1 Os pagamentos deverão ser efetivados nas datas estipuladas no presente instrumento, independentemente do faturamento das mercadorias ou da finalização dos serviços, salvo quando citado por escrito em adendo a este contrato que o pagamento será mediante entrega dos produtos.
                            </p>
                            <p>
                                4.2 Eventuais greves, motivos de força maior ou falta de matérias-prima não constituirão descumprimento contratual.
                            </p>
                            <p>
                                4.3 O atraso no pagamento do(s) título(s) sujeita ao pagamento da(s) parcela(s) vencida(s), acrescida(s) da correção monetária, de acordo com a inflação e pelo índice oficial em vigor, mais juros de 12% (doze por cento) ao ano, e de multa contratual de 2% (dois por cento), sobre o valor do montante em aberto, até o efetivo adimplemento da obrigação.
                            </p>
                            <p>
                                4.4 No caso dos débitos não serem quitados no vencimento, ficará o CONTRATANTE desde logo constituído em mora, vencendo-se antecipadamente o total da dívida, depois de verificado o inadimplemento da 2ª parcela por mais de 15 dias vencida e não paga. A CONTRATADA fica autorizada a comunicar os órgãos de proteção ao crédito, bem como ajuizar a competente ação de execução direta do presente, pelos valores que estiverem em aberto, acrescidos de todas as despesas, inclusive os encargos descritos na cláusula 4.1, correção monetária, juros, custas processuais e honorários de advogado à base de 20% sobre o montante devido.
                            </p>
                            <p>
                                4.5 Fazendo a CONTRATANTE opção por financiamento, os títulos (boletos, cheques, autorização de débito em conta ou outra aceita pela CONTRATADA) referentes a esse contrato, serão entregues ao CONTRATANTE, depois repassados ao Agente Financeiro no ato da aprovação do cadastro e permanecerão na posse deste até o último pagamento, razão pela qual, o CONTRATANTE isenta a CONTRATADA quanto a quaisquer ocorrências relativas aos pagamentos e títulos. As multas, juros e correção monetária, sejam elas decorrentes de inadimplemento ou não, obedecerão às regras constantes do contrato de financiamento firmado entre o CONTRATANTE e o Agente Financeiro, excluindo-se as aqui pactuadas, razão pela qual eventuais divergências deverão ser dirimidas diretamente entre o CONTRATANTE e o Agente Financeiro, responsável pelos títulos e recebimentos.
                            </p>
                            <p>
                                4.6 Por se tratar de mercadoria sob encomenda, não será admitida a desistência da compra após o envio do pedido para produção. Caso o pedido ainda não tenha sido enviado o cancelamento acarretará em multa de 20% sobre valor do contrato.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA QUINTA - DA CESSÃO</h4>
                            <p>
                                5.1 O CONTRATANTE declara-se ciente que a CONTRATADA cederá o crédito decorrente da operação de venda parcelada, efetuada nesta data, descrita no item "Especificação da Operação", para Instituição Financeira, a qual ficará sub-rogada em todos os direitos da cedente inclusive o de receber o valor das parcelas nas datas avençadas, por meio de ficha de compensação, débito em conta corrente, cheques ou qualquer outro meio que tenha sido indicado pelo CONTRATANTE e aceito pela cedente. A CONTRATADA autoriza a cessão parcial ou integral do crédito nas vendas a prazo. O crédito estará sujeito à aprovação da financeira.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA SEXTA - DA RESERVA DE DOMÍNIO</h4>
                            <p>
                                6.1 Por força de pacto de reserva de domínio, aqui expressamente instituído, e aceito pelas partes, fica reservada a CONTRATADA a propriedade do(s) objeto(s) descrito(s) no pedido e projetos anexos, até que seja liquidada a última das prestações mencionadas no referido pedido.
                            </p>
                            <p>
                                6.2 A posse do(s) objeto(s) descrito(s) no pedido anexo, fica sendo do CONTRATANTE, a partir desta data, mas se o mesmo faltar como pagamento de qualquer das prestações ficará desde logo constituído em mora e obrigado, sob as penas da lei, a restituir incontinenti o(s) objeto(s) condicionalmente adquirido(s), restituição essa que se fará amigavelmente.
                            </p>
                            <p>
                                6.3 Fica facultado a CONTRATADA, no caso de mora ou arrependimento do CONTRATANTE, optar pela rescisão deste contrato ou pela cobrança judicial dos títulos assinados.
                            </p>
                            <p>
                                6.4 Enquanto não tiver pago integralmente o preço, obriga-se o CONTRATANTE a manter em perfeito estado de conservação o(s) bem(ns) de cuja posse se integra neste ato, defendendo-o da turbação de terceiros.
                            </p>
                            <p>
                                6.5 Ocorrendo rescisão deste contrato por culpa do CONTRATANTE, efetuar-se-á a avaliação do objeto restituído para verificar a sua depreciação, sendo descontado o valor restante e o valor das prestações vencidas e não pagas, acrescido dos encargos de financiamento.
                            </p>
                            <p>
                                6.6 Uma vez satisfeitas as parcelas assumidas, na sua totalidade, os bens passarão a integrar o patrimônio da CONTRATANTE, deles passando a dispor de forma livre de quaisquer ônus.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA SÉTIMA - DA ENTREGA FUTURA</h4>
                            <p>
                                7.1 Entende-se por Venda Futura, aquela que não pode ser executada de imediato, seja por motivo da obra não estar concluída ou por solicitação do CONTRATANTE.
                            </p>
                            <p>
                                7.2 O CONTRATANTE deverá solicitar com antecedência mínima de 10 Dias Úteis, a conferência de medidas para adequação do projeto as medidas finais da obra pronta e partir dessa medição seguem-se os prazos pré-estabelecidos nesse instrumento.
                            </p>
                            <p>
                                7.2.1 Em caso de divergência na conferência das medidas entre a obra finalizada e o projeto apresentado, fica estabelecida a seguinte regra: a) em caso da medida ser inferior ao projeto apresentado em um percentual de 1,5 % a CONTRATADA compensará o valor pago em excesso; b) em caso da medida ser superior ao projeto apresentado em um percentual de 1,5 % o CONTRATANTE efetuará o pagamento referente a diferença apresentada. c) esta regra também se aplicará para vendas que não sejam de caráter de Venda Futura.
                            </p>
                            <p>
                                7.3 Caso a alteração implique em restituição de valores, esta será efetivada mediante a aquisição e/ ou troca por produtos fabricados pela CONTRATADA.
                            </p>
                            <p>
                                7.4 Caso o projeto aprovado seja modificado, por diferença de medidas, pedido de incrementos mediante autorização do CONTRATANTE, durante a confirmação do projeto ou execução, os valores desse acréscimo serão calculados de acordo com a data e tabela de preços em questão. Mesmo em caso de falência ou encerramento de suas atividades, a CONTRATADA se responsabiliza integralmente pela entrega e instalação dos bens objeto do presente contrato nos mesmos padrões de qualidade ajustados na contratação.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA OITAVA - DO PRODUTO DE MOSTRUÁRIO</h4>
                            <p>
                                8.1 No caso de aquisição de produtos do mostruário da loja, o CONTRATANTE fica ciente que o mobiliário será entregue nas condições apresentadas no showroom. Não cabendo qualquer tipo de indenização ou desconto no preço relacionados a defeitos existentes.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA NONA - DAS MEDIDAS E INSTALAÇÃO</h4>
                            <p>
                                9.1 A CONTRATADA efetuará conferência de medidas, após o projeto estar devidamente aprovado e contratualizado.
                            </p>
                            <p>
                                9.2 O CONTRATANTE apenas solicitará a realização de medidas no local após a obra estar finalizada, livre de bens que impossibilitem a aferição das medidas corretamente. Caso o CONTRATANTE solicite a realização de medidas antes da obra estar finalizada, deverá informar no documento checklist de obra que segue em anexo as modificações que irá fazer e as medidas que deverá seguir para a conferência do projeto e produção dos móveis.
                            </p>
                            <p>
                                9.3 A CONTRATADA não realizará alterações no projeto já aprovado a não ser que as mesmas sejam inerentes as medidas.
                            </p>
                            <p>
                                9.4 A CONTRATADA fornecerá orientação de obra para o CONTRATANTE apenas nas localidades onde a CONTRATADA fornecerá o objeto do contrato.
                            </p>
                            <p>
                                9.5 É de inteira responsabilidade do CONTRATANTE fornecer ao instalador da CONTRATADA a planta hidráulica e elétrica do local onde os produtos serão instalados, responsabilizando-se o CONTRATANTE, de forma exclusiva, por eventuais danos decorrentes de perfuração de tubulação pela falta ou divergência da referida planta.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA DÉCIMA - DISPOSIÇÕES GERAIS</h4>
                            <p>
                                10.1 Na hipótese de descumprimento de qualquer das cláusulas deste, a eventual tolerância ou concessão das partes não implicará em alteração ou novação contratual e nem impedirá de exercer, a qualquer momento, todos os direitos que lhes são assegurados.
                            </p>
                            <p>
                                10.2 A CONTRATADA oferece assistência técnica permanente aos seus produtos. Os custos de reparos, quando não cobertos pela garantia de fábrica, serão cobrados da CONTRATANTE.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA DÉCIMA PRIMEIRA - ELEIÇÃO DE FORO</h4>
                            <p>
                                11.1 As partes de comum acordo elegem o Foro da Comarca de Uberlândia para dirimir eventuais dúvidas e ações judiciais envolvendo o ora pactuado e, por estarem assim convencionadas, firmam o presente em duas vias e na presença de duas testemunhas.
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-center mb-2">CLÁUSULA DÉCIMA SEGUNDA - DA RESPONSABILIDADE DE UTILIZAÇÃO DE DADOS E COMPLIANCE</h4>
                            <p>
                                12.1 A CONTRATADA se compromete a apenas tratar dados pessoais do CONTRATANTE dentre os previstos na Lei 13.709/2018, e respeitando as cláusulas deste contrato. Somente tratará dados para fins de inteligência de marketing e consumo previsto neste contrato, não compartilhará dados pessoais com nenhum outro controlador e/ou operador, exceto em relação ao Agente Financeiro, no qual o CONTRATANTE expressamente autoriza seu compartilhamento, e manterá os dados ativos e existentes em sua base até o prazo final da garantia dos produtos contratados.
                            </p>
                            <p>
                                12.2 A não observância, por qualquer das Partes, dos ditames da LGPD sujeitará o infrator às penalidades indicadas na Lei Federal nº 13.709, de 14 de agosto de 2018.
                            </p>
                            <p>
                                12.3 As Partes estão cientes e declaram cumprir fielmente, por si e por seus sócios, administradores e colaboradores, bem como exigir o seu cumprimento pelos terceiros por elas contratados, os ditames da Lei nº 13.709/2018 - Lei Geral de Proteção de Dados (LGPD).
                            </p>
                        </section>
                    </div>

                    {/* Assinaturas */}
                    <div className="mt-16 pt-8 flex justify-between gap-8">
                        <div className="flex-1 border-t border-black text-center pt-2">
                            <p className="font-bold">{company.corporateName}</p>
                            <p className="text-xs">CONTRATADA</p>
                        </div>
                        <div className="flex-1 border-t border-black text-center pt-2">
                            <p className="font-bold">{project.client.name}</p>
                            <p className="text-xs">CONTRATANTE</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs">
                    <p>{company.address} - Tel: {company.phone}</p>
                    <p>Data de emissão: {new Date().toLocaleDateString()}</p>
                </div>

            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:static print:block">
            <div className="bg-white w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-xl shadow-2xl overflow-hidden flex flex-col print:shadow-none print:h-auto print:w-auto print:rounded-none">
                {step === 'EDIT' ? renderEditor() : renderPreview()}
            </div>
        </div>
    );
};

export default ContractModal;
