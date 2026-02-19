
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ProjectProvider, useProjects } from './ProjectContext';
import { AuthProvider } from './AuthContext';
import React from 'react';

// Mock Firebase
vi.mock('../firebase', () => ({
    auth: { onAuthStateChanged: vi.fn(() => () => { }) },
    db: {},
    storage: {},
}));

// Mock AuthContext
vi.mock('./AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: () => ({
        currentUser: { id: 'test-user', storeId: 'store-1', name: 'Test User', email: 'test@example.com', role: 'Admin' },
        loading: false
    })
}));

describe('ProjectContext - Split Batch', () => {
    it('should split a batch and return the new batch ID', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>
                <ProjectProvider>{children}</ProjectProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useProjects(), { wrapper });

        // Wait for initial load (simulated)
        // In this mock setup, data might be loaded from SEED immediately or useEffect.
        // We'll rely on SEED data being present.

        let batchToSplit = result.current.batches[0];
        // Ensure we have a batch with multiple environments
        if (batchToSplit.environmentIds.length < 2) {
            // Find one or assume seed data has one. 
            // SEED_BATCHES[0] has 'e1', 'e2'.
            batchToSplit = result.current.batches.find(b => b.environmentIds.includes('e1') && b.environmentIds.includes('e2')) || result.current.batches[0];
        }

        const envsToMove = [batchToSplit.environmentIds[0]];
        const envsToStay = batchToSplit.environmentIds.filter(id => !envsToMove.includes(id));

        const originalId = batchToSplit.id;

        let newBatchId: string | undefined;

        act(() => {
            newBatchId = result.current.splitBatch(originalId, envsToMove);
        });

        expect(newBatchId).toBeDefined();
        expect(typeof newBatchId).toBe('string');

        // Check State Updates
        const newBatch = result.current.batches.find(b => b.id === newBatchId);
        const originalBatchUpdated = result.current.batches.find(b => b.id === originalId);

        expect(newBatch).toBeDefined();
        expect(newBatch?.environmentIds).toEqual(envsToMove);
        expect(newBatch?.currentStepId).toBe(batchToSplit.currentStepId); // Should stay in same step by default

        expect(originalBatchUpdated).toBeDefined();
        expect(originalBatchUpdated?.environmentIds).toEqual(envsToStay);
    });

    it('should allow advancing the new batch independently', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>
                <ProjectProvider>{children}</ProjectProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useProjects(), { wrapper });

        // Setup: Split first
        const batchToSplit = result.current.batches.find(b => b.environmentIds.length >= 1)!;
        const envsToMove = [batchToSplit.environmentIds[0]];

        let newBatchId: string | undefined;
        act(() => {
            newBatchId = result.current.splitBatch(batchToSplit.id, envsToMove);
        });

        const newBatchBefore = result.current.batches.find(b => b.id === newBatchId)!;
        const initialStep = newBatchBefore.currentStepId;

        // Advance
        act(() => {
            result.current.advanceBatch(newBatchId!);
        });

        const newBatchAfter = result.current.batches.find(b => b.id === newBatchId)!;
        expect(newBatchAfter.currentStepId).not.toBe(initialStep);
    });
});
