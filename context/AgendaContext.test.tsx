
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AgendaProvider, useAgenda } from './AgendaContext';
import { ProjectContext } from './ProjectContext';
import React from 'react';

// Mock Firebase
vi.mock('../firebase', () => ({
    db: null // Default to null to test LocalStorage fallback first
}));

// Mock ProjectContext
const mockProjectContext = {
    currentUser: { id: 'user1', name: 'Test User', role: 'Admin', storeId: 'store1' },
    // ... add other necessary mocks if needed
};

const TestComponent = () => {
    const { appointments, addAppointment } = useAgenda();
    return (
        <div>
            <div data-testid="count">{appointments.length}</div>
            <button onClick={() => addAppointment({
                title: 'Test Apt',
                start: '2023-01-01T10:00:00Z',
                end: '2023-01-01T11:00:00Z',
                durationMinutes: 60,
                typeId: '1',
                userId: 'user1'
            })}>Add</button>
        </div>
    );
};

describe('AgendaContext (LocalStorage)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('adds an appointment locally', async () => {
        render(
            <ProjectContext.Provider value={mockProjectContext as any}>
                <AgendaProvider>
                    <TestComponent />
                </AgendaProvider>
            </ProjectContext.Provider>
        );

        expect(screen.getByTestId('count')).toHaveTextContent('0');

        await act(async () => {
            screen.getByText('Add').click();
        });

        expect(screen.getByTestId('count')).toHaveTextContent('1');
        expect(JSON.parse(localStorage.getItem('fluxo_agenda_appointments') || '[]')).toHaveLength(1);
    });
});
