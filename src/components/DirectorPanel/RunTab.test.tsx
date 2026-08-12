import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import type { ConversationScenario } from '../../kernel/contracts/conversation/scenario';
import { useDirectorStore } from '../../stores/directorStore';

const { controlsStub } = vi.hoisted(() => ({
    controlsStub: {
        load: vi.fn(),
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        skip: vi.fn(),
        override: vi.fn(),
        abort: vi.fn(),
        reset: vi.fn(),
    },
}));

vi.mock('../../stores/directorController', () => ({
    createDirectorControls: vi.fn(() => controlsStub),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

vi.mock('../../i18n/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const labels: Record<string, string> = {
                'director.run.heading': 'Run & observe',
                'director.run.noScenario': 'no scenario',
                'director.run.selected': 'Selected scenario',
                'director.run.current': 'Current',
                'director.run.objective': 'Objective',
                'director.run.progress': 'Progress',
                'director.run.run': 'Run',
                'director.run.pause': 'Pause',
                'director.run.resume': 'Resume',
                'director.run.skip': 'Skip',
                'director.run.override': 'Override',
                'director.run.abort': 'Abort',
                'director.run.overrideParticipant': 'Participant',
                'director.run.overrideObjective': 'Instruction',
                'director.run.overrideSubmit': 'Inject',
                'director.run.log': 'Turn log',
                'director.run.logEmpty': 'empty',
                'director.run.status.idle': 'Idle',
                'director.run.status.running': 'Running',
                'director.run.status.paused': 'Paused',
                'director.run.turnStatus.running': 'running',
                'director.run.turnStatus.complete': 'complete',
                'director.run.turnStatus.error': 'error',
            };
            return labels[key] || key;
        },
    }),
}));

const scenario = {
    id: 's1',
    name: 'Test scenario',
    description: 'd',
    topic: 't',
    version: 1,
    status: 'draft',
    participants: [
        { id: 'architect', role: 'Architect' },
        { id: 'auditor', role: 'Auditor' },
    ],
    turns: [
        {
            participantId: 'architect',
            objective: { type: 'INTRODUCE', description: 'plan A', constraints: [] },
        },
        {
            participantId: 'auditor',
            objective: { type: 'CRITIQUE', description: 'audit A', constraints: [] },
        },
    ],
    createdAt: 0,
    updatedAt: 0,
} as unknown as ConversationScenario;

describe('RunTab (B5.4c Run UI)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        act(() => {
            useDirectorStore.setState({
                sessionId: '',
                status: 'idle',
                currentParticipantId: null,
                turnLog: [],
            });
        });
    });

    it('renders all run controls for a selected scenario', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        expect(screen.getByText('Run & observe')).toBeDefined();
        expect(screen.getByText('Test scenario')).toBeDefined();
        for (const label of ['Run', 'Pause', 'Resume', 'Skip', 'Override', 'Abort']) {
            expect(screen.getByText(label)).toBeDefined();
        }
    });

    it('Run loads the scenario then runs it via the controller', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        fireEvent.click(screen.getByText('Run'));
        await waitFor(() => {
            expect(controlsStub.load).toHaveBeenCalledWith('s1');
            expect(controlsStub.run).toHaveBeenCalledTimes(1);
        });
    });

    it('reflects live DirectorStore updates (running + progress + log)', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        act(() => {
            useDirectorStore.setState({
                status: 'running',
                currentParticipantId: 'architect',
                turnLog: [{ participantId: 'architect', status: 'running' }],
            });
        });
        expect(screen.getByText('Running')).toBeDefined();
        expect(screen.getByText('Progress: 0/2')).toBeDefined();
        expect(
            screen.getByText((_, el) => (el?.textContent ?? '') === 'Objective: plan A'),
        ).toBeDefined(); // current turn objective
        expect(screen.getAllByText('architect').length).toBeGreaterThan(0);
        expect(screen.getByText('running')).toBeDefined();
    });

    it('shows a completed turn and an error in the log', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        act(() => {
            useDirectorStore.setState({
                status: 'running',
                currentParticipantId: 'auditor',
                turnLog: [
                    { participantId: 'architect', status: 'complete', success: true },
                    { participantId: 'auditor', status: 'error', success: false, error: 'boom' },
                ],
            });
        });
        expect(screen.getByText('complete')).toBeDefined();
        expect(screen.getByText('boom')).toBeDefined();
    });

    it('Override opens the form and submits a TurnProposal via the controller', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        act(() => {
            useDirectorStore.setState({ status: 'running' });
        });
        fireEvent.click(screen.getByText('Override'));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'architect' } });
        fireEvent.change(screen.getByPlaceholderText('Instruction'), {
            target: { value: 'injected challenge' },
        });
        fireEvent.click(screen.getByText('Inject'));
        expect(controlsStub.override).toHaveBeenCalledWith({
            participantId: 'architect',
            objective: { type: 'CHALLENGE', description: 'injected challenge', constraints: [] },
        });
    });

    it('Pause and Abort delegate to the controller', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={scenario} />);
        act(() => {
            useDirectorStore.setState({ status: 'running' });
        });
        fireEvent.click(screen.getByText('Pause'));
        fireEvent.click(screen.getByText('Abort'));
        expect(controlsStub.pause).toHaveBeenCalledTimes(1);
        expect(controlsStub.abort).toHaveBeenCalledTimes(1);
    });

    it('renders a no-scenario message when none is selected', async () => {
        const RunTab = (await import('./RunTab')).default;
        render(<RunTab scenario={null} />);
        expect(screen.getByText('no scenario')).toBeDefined();
    });
});
