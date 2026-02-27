import React, { useState } from 'react';

export interface SaleClosingData {
    saleDate: string;
    deliveryDeadlineDays: number;
    observations: string;
}

interface SaleClosingModalProps {
    isOpen: boolean;
    batchName: string;
    onConfirm: (data: SaleClosingData) => void;
    onCancel: () => void;
}

const SaleClosingModal: React.FC<SaleClosingModalProps> = ({
    isOpen,
    batchName,
    onConfirm,
    onCancel,
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [saleDate, setSaleDate] = useState(today);
    const [deliveryDays, setDeliveryDays] = useState(60);
    const [observations, setObservations] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({ saleDate, deliveryDeadlineDays: deliveryDays, observations });
        setObservations('');
        setSaleDate(today);
        setDeliveryDays(60);
    };

    // Estimativa de data de entrega (dias corridos para exibição)
    const estimatedDelivery = (() => {
        const d = new Date(saleDate + 'T12:00:00');
        d.setDate(d.getDate() + deliveryDays);
        return d.toLocaleDateString('pt-BR');
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a2632] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">handshake</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Venda Fechada!</h3>
                            <p className="text-emerald-100 text-sm">{batchName}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base flex-shrink-0">info</span>
                        Registre os dados do fechamento. A venda será marcada como efetivada e o lote avançará para <strong>Contrato e Detalhamento</strong>.
                    </div>

                    {/* Data do fechamento */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Data do Fechamento
                        </label>
                        <input
                            type="date"
                            value={saleDate}
                            onChange={e => setSaleDate(e.target.value)}
                            max={today}
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Prazo de entrega */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Prazo de Entrega Combinado
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={1}
                                max={730}
                                value={deliveryDays}
                                onChange={e => setDeliveryDays(Number(e.target.value))}
                                className="w-28 text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-slate-500">dias corridos</span>
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">
                                Previsão: {estimatedDelivery}
                            </span>
                        </div>
                    </div>

                    {/* Observações */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Observações do Fechamento <span className="text-slate-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                            rows={4}
                            placeholder="Condições negociadas, forma de pagamento, itens especiais, pendências..."
                            className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!saleDate || deliveryDays < 1}
                        className="flex-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        <span className="material-symbols-outlined text-base">verified</span>
                        Confirmar Venda Fechada
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaleClosingModal;
