import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';

export function CompanySettings() {
     const { companySettings, updateCompanySettings, currentStore, saveStoreConfig } = useProjects();
     const { showToast } = useToast();

     // Local State initialized from Context
     const [companyName, setCompanyName] = useState(companySettings.name);
     const [companyCnpj, setCompanyCnpj] = useState(companySettings.cnpj);
     const [companyAddress, setCompanyAddress] = useState(companySettings.address);
     const [companyPhone, setCompanyPhone] = useState(companySettings.phone);
     const [companyLogo, setCompanyLogo] = useState(companySettings.logoUrl || '');
     const [companySocial, setCompanySocial] = useState(companySettings.socialMedia || '');

     const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

     const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
               showToast('Apenas imagens são permitidas (JPG, PNG, GIF, WEBP, SVG).', 'error');
               return;
          }
          if (file.size > 500 * 1024) {
               showToast('A imagem deve ter no máximo 500KB.', 'error');
               return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
               const base64 = ev.target?.result as string;
               setCompanyLogo(base64);
          };
          reader.readAsDataURL(file);
     };

     const handleSaveCompany = async () => {
          await updateCompanySettings({
               ...companySettings,
               name: companyName,
               cnpj: companyCnpj,
               address: companyAddress,
               phone: companyPhone,
               logoUrl: companyLogo,
               socialMedia: companySocial
          });
          await saveStoreConfig();
          showToast("Dados da empresa salvos com sucesso!");
     };

     return (
          <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in space-y-6">
               <div className="flex gap-6 items-start">
                    <div
                         className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
                         onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                         {companyLogo ? (
                              <img src={companyLogo} className="w-full h-full object-cover" alt="Company Logo" />
                         ) : (
                              <span className="text-slate-400 font-bold text-4xl">{companyName.charAt(0)}</span>
                         )}
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-white text-2xl">upload</span>
                         </div>
                         <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                    </div>
                    <div className="flex-1 space-y-4">
                         <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo da Empresa</label>
                              <div className="flex gap-2">
                                   <button onClick={() => document.getElementById('logo-upload')?.click()} className="bg-primary/10 text-primary font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary/20 transition-colors flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">upload</span>
                                        Enviar Imagem
                                   </button>
                                   {companyLogo && (
                                        <button onClick={() => setCompanyLogo('')} className="bg-rose-50 text-rose-500 font-bold py-2 px-4 rounded-lg text-sm hover:bg-rose-100 transition-colors flex items-center gap-2">
                                             <span className="material-symbols-outlined text-sm">delete</span>
                                             Remover
                                        </button>
                                   )}
                              </div>
                              <p className="text-xs text-slate-400 mt-2">Formatos aceitos: JPG, PNG, SVG. Máximo 500KB.</p>
                         </div>
                         <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ID de Login (Slug)</label>
                              <input
                                   type="text"
                                   value={currentStore?.slug || ''}
                                   disabled
                                   className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm bg-slate-100 dark:bg-slate-900 text-slate-500"
                              />
                              <p className="text-xs text-slate-400 mt-1">Este identificador é único e usado para login. Não pode ser alterado.</p>
                         </div>
                    </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Fantasia</label>
                         <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ</label>
                         <input type="text" value={companyCnpj} onChange={e => setCompanyCnpj(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço Completo</label>
                         <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone Comercial</label>
                         <input type="text" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Redes Sociais</label>
                         <input type="text" value={companySocial} onChange={e => setCompanySocial(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="@instagram, facebook..." />
                    </div>
               </div>

               <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={handleSaveCompany} className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600">Salvar Alterações</button>
               </div>
          </div>
     );
}
