import React from 'react';

interface EditableFieldProps {
    label?: string;
    value: string | number;
    isEditing: boolean;
    onChange: (value: any) => void;
    type?: string;
    multiline?: boolean;
    rows?: number;
    options?: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
}

export default function EditableField({
    label,
    value,
    isEditing,
    onChange,
    type = 'text',
    multiline = false,
    rows = 2,
    options,
    placeholder,
    className = ''
}: EditableFieldProps) {
    if (isEditing) {
        if (options) {
            return (
                <div className={className}>
                    {/* label is handled by parent, so we don't render it to avoid duplication */}
                    <select
                        className="w-full rounded-lg border-slate-200 text-sm h-9"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (multiline) {
            return (
                <div className={className}>
                    <textarea
                        className="w-full rounded-lg border-slate-200 text-sm"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        rows={rows}
                        placeholder={placeholder}
                    />
                </div>
            );
        }

        return (
            <div className={className}>
                <input
                    type={type}
                    className="w-full rounded-lg border-slate-200 text-sm"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            </div>
        );
    }

    return (
        <div className={className}>
            <p className="text-slate-800 dark:text-slate-200">
                {type === 'number' && Number(value) > 0 ? `R$ ${Number(value).toLocaleString()}` : (value ? value : '-')}
            </p>
        </div>
    );
}
