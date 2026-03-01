import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';

export function HolidaysSettings() {
     const { companySettings, updateCompanySettings, saveStoreConfig } = useProjects();
     const { showToast } = useToast();

     const [newHolidayDate, setNewHolidayDate] = useState('');
     const [newHolidayName, setNewHolidayName] = useState('');
     const [newHolidayType, setNewHolidayType] = useState<'fixed' | 'movable'>('fixed');
     const [saving, setSaving] = useState(false);

     const handleAddHoliday = async () => {
          if (!newHolidayDate || !newHolidayName) {
               showToast('Data e nome do feriado são obrigatórios.', 'error');
               return;
          }

          const newHoliday = {
               date: newHolidayDate,
               name: newHolidayName,
               type: newHolidayType,
               year: newHolidayType === 'movable' ? new Date().getFullYear() : undefined
          };

          const holidays = companySettings.holidays || [];
          const isDuplicate = holidays.some(h =>
               h.date === newHolidayDate && h.type === newHolidayType && h.year === newHoliday.year
          );

          if (isDuplicate) {
               showToast('Este feriado já está cadastrado.', 'error');
               return;
          }

          setSaving(true);
          await updateCompanySettings({
               ...companySettings,
               holidays: [...holidays, newHoliday]
          });
          await saveStoreConfig();
          setSaving(false);

          setNewHolidayDate('');
          setNewHolidayName('');
          setNewHolidayType('fixed');
     };

     const handleRemoveHoliday = async (index: number) => {
          if (!confirm('Tem certeza que deseja remover este feriado?')) return;

          const holidays = companySettings.holidays || [];
          const updated = holidays.filter((_, i) => i !== index);

          setSaving(true);
          await updateCompanySettings({
               ...companySettings,
               holidays: updated
          });
          await saveStoreConfig();
          setSaving(false);
     };

     return (
          <div className="space-y-6 animate-fade-in">
               {/* Fixed Holidays Section */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Feriados Fixos (Obrigatórios)</h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                         <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                   <tr>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Data (MM-DD)</th>
                                        <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Nome</th>
                                   </tr>
                              </thead>
                              <tbody>
                                   {[
                                        { date: '01-01', name: 'Confraternização Universal' },
                                        { date: '04-21', name: 'Tiradentes' },
                                        { date: '05-01', name: 'Dia do Trabalho' },
                                        { date: '09-07', name: 'Independência do Brasil' },
                                        { date: '10-12', name: 'Nossa Senhora Aparecida' },
                                        { date: '11-02', name: 'Finados' },
                                        { date: '11-15', name: 'Proclamação da República' },
                                        { date: '12-25', name: 'Natal' },
                                   ].map((holiday, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                             <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{holiday.date}</td>
                                             <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{holiday.name}</td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    </div>
               </div>

               {/* Custom Holidays Section */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Feriados Customizados</h3>

                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-6 border border-slate-200 dark:border-slate-700">
                         <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Adicionar novo feriado</p>
                         <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                              <div>
                                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Data</label>
                                   <input
                                        type={newHolidayType === 'fixed' ? 'text' : 'date'}
                                        placeholder={newHolidayType === 'fixed' ? 'MM-DD' : 'YYYY-MM-DD'}
                                        value={newHolidayDate}
                                        onChange={(e) => setNewHolidayDate(e.target.value)}
                                        className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                   />
                              </div>
                              <div>
                                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome</label>
                                   <input
                                        type="text"
                                        placeholder="Ex: Carnaval"
                                        value={newHolidayName}
                                        onChange={(e) => setNewHolidayName(e.target.value)}
                                        className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                   />
                              </div>
                              <div>
                                   <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tipo</label>
                                   <select
                                        value={newHolidayType}
                                        onChange={(e) => {
                                             setNewHolidayType(e.target.value as 'fixed' | 'movable');
                                             setNewHolidayDate('');
                                        }}
                                        className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                   >
                                        <option value="fixed">Fixo (Todo ano)</option>
                                        <option value="movable">Móvel (Ano específico)</option>
                                   </select>
                              </div>
                              <div className="flex items-end">
                                   <button
                                        onClick={handleAddHoliday}
                                        disabled={saving}
                                        className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded transition-colors"
                                   >
                                        {saving ? 'Salvando...' : 'Adicionar'}
                                   </button>
                              </div>
                         </div>
                    </div>

                    {companySettings.holidays && companySettings.holidays.length > 0 ? (
                         <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-sm">
                                   <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                             <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Data</th>
                                             <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Nome</th>
                                             <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Tipo</th>
                                             <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Ação</th>
                                        </tr>
                                   </thead>
                                   <tbody>
                                        {companySettings.holidays.map((holiday, idx) => (
                                             <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{holiday.date}</td>
                                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{holiday.name}</td>
                                                  <td className="px-4 py-3">
                                                       <span className={`text-xs font-bold px-2 py-1 rounded ${holiday.type === 'fixed'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                            }`}>
                                                            {holiday.type === 'fixed' ? 'Fixo' : `Móvel (${holiday.year})`}
                                                       </span>
                                                  </td>
                                                  <td className="px-4 py-3">
                                                       <button
                                                            onClick={() => handleRemoveHoliday(idx)}
                                                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                                                       >
                                                            Remover
                                                       </button>
                                                  </td>
                                             </tr>
                                        ))}
                                   </tbody>
                              </table>
                         </div>
                    ) : (
                         <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">Nenhum feriado customizado cadastrado</p>
                    )}
               </div>
          </div>
     );
}
