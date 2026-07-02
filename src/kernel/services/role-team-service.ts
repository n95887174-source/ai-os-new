import type { IRoleTeamService, RoleTeam, TeamTemplate } from '../contracts/role-team';
import { DEFAULT_TEAM_TEMPLATES } from '../contracts/role-team';

let _idCounter = 0;
function genId(): string {
    _idCounter++;
    return `team-${Date.now()}-${_idCounter}`;
}

export class RoleTeamService implements IRoleTeamService {
    private teams = new Map<string, RoleTeam>();

    listTeams(): RoleTeam[] {
        return Array.from(this.teams.values());
    }

    getTeam(id: string): RoleTeam | undefined {
        return this.teams.get(id);
    }

    createTeam(input: Omit<RoleTeam, 'id'>): RoleTeam {
        const now = Date.now();
        const team: RoleTeam = {
            ...input,
            id: genId(),
            metadata: {
                ...input.metadata,
                created: input.metadata?.created || now,
                updated: now,
            },
        };
        this.teams.set(team.id, team);
        return team;
    }

    updateTeam(id: string, patch: Partial<RoleTeam>): void {
        const existing = this.teams.get(id);
        if (!existing) return;
        this.teams.set(id, {
            ...existing,
            ...patch,
            metadata: { ...existing.metadata, ...patch.metadata, updated: Date.now() },
            executionConfig: { ...existing.executionConfig, ...patch.executionConfig },
        });
    }

    deleteTeam(id: string): void {
        this.teams.delete(id);
    }

    getTemplates(): TeamTemplate[] {
        return DEFAULT_TEAM_TEMPLATES;
    }

    createFromTemplate(templateId: string, overrides?: Partial<RoleTeam>): RoleTeam {
        const tpl = DEFAULT_TEAM_TEMPLATES.find((t) => t.id === templateId);
        if (!tpl) throw new Error(`Template "${templateId}" not found`);
        const now = Date.now();
        const team: RoleTeam = {
            id: genId(),
            name: overrides?.name || tpl.name,
            description: overrides?.description || tpl.description,
            icon: overrides?.icon || tpl.icon,
            color: overrides?.color || tpl.color,
            roleIds: overrides?.roleIds || [...tpl.recommendedRoles],
            coordinationStrategy: overrides?.coordinationStrategy || tpl.defaultStrategy,
            metadata: {
                domain: overrides?.metadata?.domain || tpl.domain,
                created: now,
                updated: now,
                author: overrides?.metadata?.author,
                tags: overrides?.metadata?.tags || [],
                version: '1.0',
                isBuiltin: false,
                isTemplate: false,
            },
            executionConfig: overrides?.executionConfig || {
                maxRounds: 3,
                consensusThreshold: 0.7,
                parallelTimeout: 30000,
            },
            ...overrides,
        };
        this.teams.set(team.id, team);
        return team;
    }
}
