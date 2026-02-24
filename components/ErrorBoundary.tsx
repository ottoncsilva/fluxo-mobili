import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
                    <span className="material-symbols-outlined text-5xl text-rose-400 mb-4">error</span>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Algo deu errado</h2>
                    <p className="text-sm text-slate-500 mb-4">
                        {this.state.error?.message || 'Erro inesperado no componente.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-600"
                    >
                        Tentar novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
