import type { CSSProperties } from 'react';

export const flexCenter: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
export const flexBetween: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
export const flexCol: CSSProperties = { display: 'flex', flexDirection: 'column' };
export const flexCenterCol: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };

export const textMuted: CSSProperties = { color: '#94a3b8' };
export const textPrimary: CSSProperties = { color: '#f1f5f9' };
export const textSecondary: CSSProperties = { color: '#64748b' };
export const textSm: CSSProperties = { fontSize: '0.8rem' };
export const textXs: CSSProperties = { fontSize: '0.75rem' };
export const textLg: CSSProperties = { fontSize: '1.1rem' };

export const panel: CSSProperties = { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1rem' };
export const card: CSSProperties = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.75rem' };
export const input: CSSProperties = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' };
export const button: CSSProperties = { padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' };
export const buttonSm: CSSProperties = { padding: '0.35rem 0.75rem', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' };
export const buttonGhost: CSSProperties = { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' };
export const label: CSSProperties = { color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' };
export const divider: CSSProperties = { border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.75rem 0' };
export const iconBtn: CSSProperties = { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 };
export const badge: CSSProperties = { padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 };
export const scrollY: CSSProperties = { overflowY: 'auto', overflowX: 'hidden' };
export const truncate: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
export const gap2: CSSProperties = { gap: '0.5rem' };
export const gap1: CSSProperties = { gap: '0.25rem' };

export const flexCenterGap2: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' };
export const flexColGap2: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
export const flexColGap3: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
export const flexColGap4: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };
export const flexBetweenGap2: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' };
export const flexCenterGap1: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.25rem' };
export const flexCenterGap3: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem' };
export const flexCenterGap4: CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem' };
export const flexWrapGap2: CSSProperties = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' };
export const flexAlignStart: CSSProperties = { display: 'flex', alignItems: 'flex-start' };
export const flexAlignEnd: CSSProperties = { display: 'flex', alignItems: 'flex-end' };

export const textWhite: CSSProperties = { color: '#f8fafc' };
export const textWhiteWeight700: CSSProperties = { color: '#f8fafc', fontWeight: 700 };
export const textMutedSm: CSSProperties = { color: '#94a3b8', fontSize: '0.75rem' };
export const textSecondarySm: CSSProperties = { color: '#64748b', fontSize: '0.75rem' };
export const textMutedXs: CSSProperties = { color: '#94a3b8', fontSize: '0.7rem' };
export const textSecondaryXs: CSSProperties = { color: '#64748b', fontSize: '0.7rem' };
export const textWhiteXs: CSSProperties = { color: '#f8fafc', fontSize: '0.75rem' };

export const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' };
export const grid3: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' };
export const grid4: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' };

export const emptyState: CSSProperties = { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' };

export const glassPanel: CSSProperties = { padding: '1.25rem', borderRadius: 8, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' };
export const glassPanelAlt: CSSProperties = { padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' };

export const errorContainer: CSSProperties = { padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };
export const errorCard: CSSProperties = { padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem' };

export const inputBase: CSSProperties = { padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' };
export const selectBase: CSSProperties = { padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' };

/* Cross-file common patterns (x3+) */
export const flexJustifyBetween: CSSProperties = { display: 'flex', justifyContent: 'space-between' };
export const flexCenterSmGap: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.4rem' };
export const flexCenterGapSm: CSSProperties = { display: 'flex', alignItems: 'center', gap: 4 };
export const flexColGap6: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.5rem' };
export const flexColGap5: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1.25rem' };
export const flexWrapAlignCenter: CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap' };

export const textWhiteWeight700Sm: CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' };
export const textMutedWeight700Xs: CSSProperties = { fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };

export const panelRounded16: CSSProperties = { padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' };
export const panelDark: CSSProperties = { padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' };

export const h3Section: CSSProperties = { margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' };
export const h3SectionFlex: CSSProperties = { margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' };

export const btnDangerSm: CSSProperties = { padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 };
export const btnSuccessSm: CSSProperties = { padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 };

export const sectionHeader: CSSProperties = { fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' };

export const flexBetweenMarginBottom: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' };
export const flexCenterFull: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

export const metricCard: CSSProperties = { padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' };
export const proseLine: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' };

/* Additional helpers referenced by script */
export const flex1: CSSProperties = { flex: 1 };
export const flex1Min0: CSSProperties = { flex: 1, minWidth: 0 };
export const flex1Min100: CSSProperties = { flex: 1, minWidth: 100 };
export const posRelative: CSSProperties = { position: 'relative' };
export const textCenter: CSSProperties = { textAlign: 'center' };
export const flexGap2: CSSProperties = { display: 'flex', gap: '0.5rem' };
export const flexCenterGap6px: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
export const flexColFull: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
export const inputDarkBg: CSSProperties = { padding: '0.6rem 0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' };
export const textMutedWeight700XsMargin: CSSProperties = { fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' };
export const textMutedWeight600Xs: CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' };
export const flexCenterGap6: CSSProperties = { display: 'flex', gap: '1.5rem', alignItems: 'center' };
export const flexColGap1: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' };
export const iconBtnBlue: CSSProperties = { width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer', display: 'grid', placeItems: 'center' };
export const textSecondaryItalic: CSSProperties = { color: '#64748b', fontStyle: 'italic' };
export const flexWrapAlignCenter: CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap' };
export const alignCenter: CSSProperties = { alignItems: 'center' };
export const textMutedWeightSm: CSSProperties = { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' };
