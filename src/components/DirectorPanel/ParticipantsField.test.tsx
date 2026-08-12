import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParticipantsField from './ParticipantsField';

const agents = [
    { id: 'architect', name: 'Architect', role: 'Architect', status: 'active', stats: {} },
    { id: 'auditor', name: 'Auditor', role: 'Auditor', status: 'active', stats: {} },
];

const hoisted = vi.hoisted(() => ({ getAgents: vi.fn() }));

vi.mock('../../kernel/instances/services-core', () => ({
    agentService: { getAgents: hoisted.getAgents },
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
                'director.configure.participants': 'Participants',
                'director.configure.add_participant': 'Add participant',
                'director.configure.select_agent': 'Select agent',
                'director.configure.no_agents': 'No agents available',
                'director.configure.participant_id': 'ID',
                'director.configure.participant_role': 'Role',
                'director.configure.remove': 'Remove',
            };
            return labels[key] || key;
        },
    }),
}));

describe('ParticipantsField (Director A — Agent Registry integration)', () => {
    beforeEach(() => {
        hoisted.getAgents.mockReturnValue(agents);
    });

    it('adds a real agent from the registry dropdown', () => {
        const onChange = vi.fn();
        render(<ParticipantsField value={[]} onChange={onChange} />);

        fireEvent.change(screen.getByLabelText('Select agent'), { target: { value: 'architect' } });
        fireEvent.click(screen.getByText('Add participant'));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith([{ id: 'architect', role: 'Architect' }]);
    });

    it('does not add when no agent is selected', () => {
        const onChange = vi.fn();
        render(<ParticipantsField value={[]} onChange={onChange} />);
        fireEvent.click(screen.getByText('Add participant'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('shows a hint when the registry is empty', () => {
        const onChange = vi.fn();
        hoisted.getAgents.mockReturnValue([]);
        render(<ParticipantsField value={[]} onChange={onChange} />);
        expect(screen.getByText('No agents available')).toBeDefined();
    });
});
