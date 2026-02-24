import { describe, it, expect } from 'vitest';
import { isHoliday, isBusinessDay, addBusinessDays, getBusinessDaysDifference } from './dateUtils';

// Datas de referência (fixas para evitar flakiness)
// 2024-01-08 = Segunda-feira (dia útil normal)
// 2024-01-06 = Sábado
// 2024-01-07 = Domingo
// 2024-01-01 = Confraternização Universal (feriado)
// 2024-04-21 = Tiradentes (domingo + feriado)
// 2024-01-09 = Terça-feira
// 2024-01-12 = Sexta-feira
// 2024-01-13 = Sábado
// 2024-01-14 = Domingo
// 2024-01-15 = Segunda-feira

describe('isHoliday', () => {
    it('retorna true para feriado nacional (01/01)', () => {
        expect(isHoliday(new Date('2024-01-01'))).toBe(true);
    });

    it('retorna true para Tiradentes (21/04)', () => {
        expect(isHoliday(new Date('2024-04-21'))).toBe(true);
    });

    it('retorna true para Natal (25/12)', () => {
        expect(isHoliday(new Date('2024-12-25'))).toBe(true);
    });

    it('retorna false para dia comum', () => {
        expect(isHoliday(new Date('2024-01-08'))).toBe(false); // Segunda normal
    });

    it('retorna false para sábado comum', () => {
        expect(isHoliday(new Date('2024-01-06'))).toBe(false);
    });
});

describe('isBusinessDay', () => {
    it('retorna true para uma segunda-feira comum', () => {
        expect(isBusinessDay(new Date('2024-01-08'))).toBe(true);
    });

    it('retorna true para uma sexta-feira comum', () => {
        expect(isBusinessDay(new Date('2024-01-12'))).toBe(true);
    });

    it('retorna false para sábado', () => {
        expect(isBusinessDay(new Date('2024-01-06'))).toBe(false);
    });

    it('retorna false para domingo', () => {
        expect(isBusinessDay(new Date('2024-01-07'))).toBe(false);
    });

    it('retorna false para feriado numa segunda (01/01)', () => {
        // 2024-01-01 é segunda-feira E feriado
        expect(isBusinessDay(new Date('2024-01-01'))).toBe(false);
    });

    it('retorna false para Dia do Trabalho (01/05) mesmo sendo quarta', () => {
        // 2024-05-01 é quarta-feira
        expect(isBusinessDay(new Date('2024-05-01'))).toBe(false);
    });
});

describe('addBusinessDays', () => {
    it('soma 5 dias úteis a partir de uma segunda (pula fim de semana)', () => {
        // Segunda 08/01 + 5 dias úteis = Segunda 15/01 (pula sábado e domingo)
        const result = addBusinessDays(new Date('2024-01-08'), 5);
        expect(result.toDateString()).toBe(new Date('2024-01-15').toDateString());
    });

    it('soma 1 dia útil a partir de uma sexta (pula para segunda)', () => {
        // Sexta 12/01 + 1 = Segunda 15/01
        const result = addBusinessDays(new Date('2024-01-12'), 1);
        expect(result.toDateString()).toBe(new Date('2024-01-15').toDateString());
    });

    it('com daysToAdd = 0 a partir de dia útil, retorna o mesmo dia', () => {
        const result = addBusinessDays(new Date('2024-01-08'), 0);
        expect(result.toDateString()).toBe(new Date('2024-01-08').toDateString());
    });

    it('com daysToAdd = 0 a partir de sábado, avança para a próxima segunda', () => {
        const result = addBusinessDays(new Date('2024-01-06'), 0); // Sábado
        expect(result.toDateString()).toBe(new Date('2024-01-08').toDateString()); // Segunda
    });

    it('pula feriado ao somar dias úteis', () => {
        // Sexta 19/04/2024 + 1 dia útil = Terça 23/04/2024 (pula sábado, domingo e Tiradentes 21/04)
        const result = addBusinessDays(new Date('2024-04-19'), 1);
        expect(result.toDateString()).toBe(new Date('2024-04-22').toDateString());
    });

    it('aceita string como entrada', () => {
        const result = addBusinessDays('2024-01-08', 2);
        expect(result.toDateString()).toBe(new Date('2024-01-10').toDateString());
    });
});

describe('getBusinessDaysDifference', () => {
    it('retorna 0 para a mesma data', () => {
        expect(getBusinessDaysDifference('2024-01-08', '2024-01-08')).toBe(0);
    });

    it('retorna 1 para datas consecutivas de dias úteis', () => {
        // Segunda → Terça
        expect(getBusinessDaysDifference('2024-01-08', '2024-01-09')).toBe(1);
    });

    it('retorna 4 de segunda a sexta (mesma semana)', () => {
        expect(getBusinessDaysDifference('2024-01-08', '2024-01-12')).toBe(4);
    });

    it('retorna 5 de uma segunda à próxima (pula fim de semana)', () => {
        expect(getBusinessDaysDifference('2024-01-08', '2024-01-15')).toBe(5);
    });

    it('retorna negativo quando prazo já passou (bug corrigido)', () => {
        // Prazo era terça 09/01, agora estamos na quarta 10/01 → -1
        const resultado = getBusinessDaysDifference('2024-01-10', '2024-01-09');
        expect(resultado).toBe(-1);
    });

    it('retorna negativo correto saltando fim de semana', () => {
        // Agora é segunda 15/01, prazo era sexta 12/01 → -1 dia útil atrasado
        const resultado = getBusinessDaysDifference('2024-01-15', '2024-01-12');
        expect(resultado).toBe(-1);
    });

    it('retorna negativo para 5 dias atrasado', () => {
        // Agora é segunda 15/01, prazo era segunda 08/01 → -5 dias úteis
        const resultado = getBusinessDaysDifference('2024-01-15', '2024-01-08');
        expect(resultado).toBe(-5);
    });

    it('não conta finais de semana na diferença', () => {
        // Sexta a segunda = 1 dia útil (não 3 de calendário)
        expect(getBusinessDaysDifference('2024-01-12', '2024-01-15')).toBe(1);
    });

    it('não conta feriados na diferença', () => {
        // Sexta 19/04 a terça 23/04 = 2 dias úteis (Tiradentes 21/04 e fim de semana excluídos)
        expect(getBusinessDaysDifference('2024-04-19', '2024-04-23')).toBe(2);
    });

    it('aceita string como entrada', () => {
        expect(getBusinessDaysDifference('2024-01-08', '2024-01-10')).toBe(2);
    });
});
