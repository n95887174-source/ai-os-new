import React from 'react';
import { debateEngine } from '../kernel/instances';
import { btn } from './DebateReplayTypes';

interface Props {
    selectedId: string | null;
}

const DebateReplayLiveControls: React.FC<Props> = ({ selectedId }) => (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.3rem 0' }}>
        <button
            onClick={() => {
                try {
                    debateEngine.pauseSession(selectedId!);
                } catch (e) {
                    console.warn('[DebateReplay] pause failed:', e);
                }
            }}
            style={btn('rgba(168,85,247,0.1)', '#a855f7')}
        >
            Pause
        </button>
        <button
            onClick={() => {
                try {
                    debateEngine.resumeSession(selectedId!);
                } catch (e) {
                    console.warn('[DebateReplay] resume failed:', e);
                }
            }}
            style={btn('rgba(34,197,94,0.1)', '#22c55e')}
        >
            Resume
        </button>
        <button
            onClick={() => {
                try {
                    debateEngine.cancelSession(selectedId!);
                } catch (e) {
                    console.warn('[DebateReplay] cancel failed:', e);
                }
            }}
            style={btn('rgba(239,68,68,0.1)', '#ef4444')}
        >
            Cancel
        </button>
    </div>
);

export default DebateReplayLiveControls;
