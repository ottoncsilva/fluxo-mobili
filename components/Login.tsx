import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';

const Login: React.FC = () => {
    const { login } = useProjects();

    // Login Form
    const [storeSlug, setStoreSlug] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Simulate network delay for UX
            await new Promise(resolve => setTimeout(resolve, 600));

            const result = await login(storeSlug, username, password);

            if (result === true) {
                // Success handled by context redirect (App.tsx)
            } else if (result === 'suspended') {
                setError('Esta loja está suspensa. Entre em contato com o suporte.');
                setIsLoading(false);
            } else {
                setError('Credenciais inválidas. Verifique Loja, Usuário e Senha.');
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao conectar. Tente novamente.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f0f2f5] dark:bg-[#0b1116] items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl h-auto min-h-[500px] bg-white dark:bg-[#161f29] rounded-3xl shadow-2xl flex overflow-hidden z-10 border border-white/50 dark:border-slate-800">

                {/* Left Side (Visual) */}
                <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-primary to-blue-700 items-center justify-center p-12 text-white">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                    <div className="relative z-10 max-w-sm">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/30 shadow-xl">
                            <span className="text-3xl font-bold">F</span>
                        </div>
                        <h2 className="text-4xl font-extrabold mb-4 leading-tight">
                            Gerencie seus clientes com maestria.
                        </h2>
                        <p className="text-blue-100 text-lg leading-relaxed opacity-90">
                            Fluxo Mobili integra vendas, projetos, medição e fábrica em um único fluxo contínuo.
                        </p>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center transition-all">
                    <div className="md:hidden w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6">F</div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Bem-vindo de volta!
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        Insira suas credenciais para acessar o painel.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ID da Loja (Slug)</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">store</span>
                                <input
                                    type="text"
                                    value={storeSlug}
                                    onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="ex: modelo"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Usuário</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="seu.usuario"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Senha</label>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium flex items-center gap-2 animate-fade-in">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                        w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 
                        hover:bg-primary-600 hover:shadow-primary/40 active:scale-[0.98] 
                        transition-all flex items-center justify-center gap-2
                        ${isLoading ? 'opacity-70 cursor-wait' : ''}
                    `}
                        >
                            {isLoading ? 'Entrando...' : 'Acessar Painel'}
                        </button>
                    </form>


                </div>
            </div>

            <div className="absolute bottom-4 text-xs text-slate-400 text-center w-full">
                &copy; 2025 Fluxo Mobili. Todos os direitos reservados.
            </div>
        </div>
    );
};

export default Login;