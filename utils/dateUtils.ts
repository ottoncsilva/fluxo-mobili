
// utils/dateUtils.ts

// Feriados Nacionais Fixos (Brasil)
const FIXED_HOLIDAYS: Record<string, string> = {
    '01-01': 'Confraternização Universal',
    '04-21': 'Tiradentes',
    '05-01': 'Dia do Trabalho',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Senhora Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '12-25': 'Natal'
};

// Função auxiliar para formatar data como MM-DD
const formatMonthDay = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
};

/**
 * Verifica se uma data é feriado nacional fixo.
 * (Nota: Feriados móveis como Carnaval e Corpus Christi não estão incluídos nesta versão simples)
 */
export const isHoliday = (date: Date): boolean => {
    const key = formatMonthDay(date);
    return !!FIXED_HOLIDAYS[key];
};

/**
 * Verifica se é dia útil (Segunda a Sexta, exceto feriados).
 */
export const isBusinessDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    if (isHoliday(date)) return false;
    return true;
};

/**
 * Adiciona dias úteis a uma data.
 */
export const addBusinessDays = (startDate: Date | string, daysToAdd: number): Date => {
    const date = new Date(startDate);
    let daysAdded = 0;

    // Se dias a adicionar for 0, retorna a data original (mas verifique se cai em fds/feriado se necessário? 
    // SLA 0 geralmente significa "mesmo dia", então se cair no domingo, deve ir pra segunda?
    // Pela lógica de prazo, sim. Mas vamos manter simples: soma dias úteis.

    // Se daysToAdd for 0, e hoje não for útil, move para o próximo útil.
    if (daysToAdd === 0) {
        while (!isBusinessDay(date)) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }

    while (daysAdded < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (isBusinessDay(date)) {
            daysAdded++;
        }
    }

    return date;
};

/**
 * Calcula a diferença em dias úteis entre duas datas.
 */
export const getBusinessDaysDifference = (startDate: Date | string, endDate: Date | string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Zerar horas para comparação correta de dias
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > end) return 0;

    let count = 0;
    let current = new Date(start);
    current.setDate(current.getDate() + 1); // Começa a contar do dia seguinte

    while (current <= end) {
        if (isBusinessDay(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
};
