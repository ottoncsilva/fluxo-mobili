import React, { useState } from 'react';

export function AppearanceSettings() {
     const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
          return (localStorage.getItem('fluxo_erp_theme') as 'light' | 'dark' | 'auto') || 'auto';
     });

     const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
          setTheme(newTheme);
          localStorage.setItem('fluxo_erp_theme', newTheme);
          const isDark = newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.classList.toggle('dark', isDark);
     };

     return (
          <div className="space-y-6 animate-fade-in">
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Tema da Interface</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Escolha como o FluxoERP aparece para você.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {([
                              { key: 'light' as const, icon: 'light_mode', label: 'Claro', desc: 'Fundo claro com texto escuro' },
                              { key: 'dark' as const, icon: 'dark_mode', label: 'Escuro', desc: 'Fundo escuro, ideal para noite' },
                              { key: 'auto' as const, icon: 'contrast', label: 'Automático', desc: 'Segue a preferência do sistema' },
                         ]).map(opt => (
                              <button
                                   key={opt.key}
                                   onClick={() => handleThemeChange(opt.key)}
                                   className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${theme === opt.key
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                              >
                                   <div className="flex items-center gap-3 mb-2">
                                        <span className={`material-symbols-outlined text-2xl ${theme === opt.key ? 'text-primary' : 'text-slate-400'}`}>{opt.icon}</span>
                                        <span className={`font-bold ${theme === opt.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                                        {theme === opt.key && <span className="material-symbols-outlined text-primary text-sm ml-auto">check_circle</span>}
                                   </div>
                                   <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                              </button>
                         ))}
                    </div>
               </div>
          </div>
     );
}
