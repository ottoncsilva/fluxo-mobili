// context/AuthContext.tsx
// Gerencia o estado de autenticação do usuário atual de forma isolada.
// O ProjectContext consome este contexto para obter currentUser, setCurrentUser e useCloud.
// Componentes que precisam apenas saber quem está logado podem usar useAuth() diretamente,
// sem precisar carregar todo o ProjectContext.

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { db } from '../firebase';

const STORAGE_KEY_USER = 'fluxo_erp_user';

// Constante global: indica se o Firebase está disponível.
// Não muda em runtime, então não precisa ser estado.
export const USE_CLOUD = !!db;

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface AuthContextType {
    /** Usuário atualmente logado, ou null se não autenticado. */
    currentUser: User | null;
    /** Define o usuário logado e persiste no localStorage. Passe null para deslogar. */
    setCurrentUser: (user: User | null) => void;
    /** true se o Firebase estiver configurado, false para modo localStorage. */
    useCloud: boolean;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUserState] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_USER);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    /**
     * Atualiza o usuário logado e sincroniza com o localStorage.
     * - user !== null → salva no localStorage
     * - user === null → remove do localStorage (logout)
     */
    const setCurrentUser = (user: User | null) => {
        setCurrentUserState(user);
        if (user) {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    };

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser, useCloud: USE_CLOUD }}>
            {children}
        </AuthContext.Provider>
    );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
    }
    return context;
};
