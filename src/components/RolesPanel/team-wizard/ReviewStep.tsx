import React from 'react';
import { TEAM_DOMAIN_ICONS, STRATEGY_COLORS } from '../../../kernel/contracts/role-team';
import { chip, inputBase } from './wizard-constants';
import type { TeamState } from './wizard-constants';

const ReviewStep: React.FC<TeamState> = ({ team, setTeam }) => (
    <div>
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
                padding: 16,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
            }}
        >
            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${team.color || '#3b82f6'}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                }}
            >
                {team.icon || '👥'}
            </div>
            <div style={{ flex: 1 }}>
                <div
                    style={{
                        fontWeight: 700,
                        color: '#e2e8f0',
                        fontSize: '1.1rem',
                    }}
                >
                    {team.name || 'Unnamed Team'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                    {team.description || 'No description'}
                </div>
            </div>
        </div>
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16,
            }}
        >
            <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>Domain</div>
                <div
                    style={{
                        fontSize: '0.85rem',
                        color: '#e2e8f0',
                        marginTop: 2,
                        textTransform: 'capitalize',
                    }}
                >
                    {TEAM_DOMAIN_ICONS[team.metadata?.domain || 'custom']}{' '}
                    {team.metadata?.domain || 'custom'}
                </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                    Strategy
                </div>
                <div
                    style={{
                        fontSize: '0.85rem',
                        color: STRATEGY_COLORS[team.coordinationStrategy || 'parallel'],
                        marginTop: 2,
                        fontWeight: 600,
                    }}
                >
                    {team.coordinationStrategy}
                </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>Roles</div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: 2 }}>
                    {team.roleIds?.length || 0} selected
                </div>
            </div>
            <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>
                    Max Rounds
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: 2 }}>
                    {team.executionConfig?.maxRounds || 3}
                </div>
            </div>
        </div>
        <div style={{ marginBottom: 16 }}>
            <div
                style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#64748b',
                    marginBottom: 6,
                }}
            >
                Selected Roles
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(team.roleIds || []).map((roleId) => (
                    <span key={roleId} style={{ ...chip('#3b82f6'), fontSize: '0.65rem' }}>
                        {roleId}
                    </span>
                ))}
                {(team.roleIds?.length || 0) === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No roles selected</span>
                )}
            </div>
        </div>
        <div>
            <label
                style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#64748b',
                    display: 'block',
                    marginBottom: 4,
                }}
            >
                Team Name
            </label>
            <input
                value={team.name || ''}
                onChange={(e) => setTeam((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter a name for your team"
                style={{ ...inputBase, maxWidth: 400 }}
            />
            {!team.name?.trim() && (
                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>
                    Name is required to create the team
                </div>
            )}
        </div>
    </div>
);

export default ReviewStep;
