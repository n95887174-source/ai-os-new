import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Send, Loader2, Volume2, AlertCircle } from 'lucide-react';
import PanelLoader from '../PanelLoader';
import { geminiLiveService } from '../../kernel/instances';
import { usePolling } from '../Common/usePolling';
import type { GeminiLiveSession } from '../../kernel/contracts/gemini-live';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    idle: { color: '#64748b', label: 'Idle' },
    listening: { color: '#22c55e', label: 'Listening...' },
    thinking: { color: '#3b82f6', label: 'Thinking...' },
    speaking: { color: '#a855f7', label: 'Speaking...' },
    error: { color: '#ef4444', label: 'Error' },
};

const GeminiLivePanelContent: React.FC = () => {
    const [session, setSession] = useState<GeminiLiveSession>(() => geminiLiveService.getSession());
    const [textInput, setTextInput] = useState('');
    const [supported] = useState(() => geminiLiveService.isSupported());
    const endRef = useRef<HTMLDivElement>(null);

    const poll = useCallback(() => {
        setSession(geminiLiveService.getSession());
    }, []);

    // C-95: usePolling gates on document.hidden — pauses when tab is backgrounded
    usePolling(poll, 300);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session.messages.length]);

    const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.idle;

    const handleStart = async () => {
        await geminiLiveService.start();
        poll();
    };

    const handleStop = () => {
        geminiLiveService.stop();
        poll();
    };

    const handleSendText = async () => {
        if (!textInput.trim()) return;
        const text = textInput.trim();
        setTextInput('');
        await geminiLiveService.sendText(text);
        poll();
    };

    const isLive = session.status !== 'idle' && session.status !== 'error';

    return (
        <div
            style={{
                padding: 16,
                height: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Volume2 size={20} color="#4285F4" /> Gemini Live
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        Real-time voice conversation with Gemini
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: status.color,
                            boxShadow: isLive ? `0 0 8px ${status.color}` : 'none',
                            transition: 'all 0.3s',
                        }}
                    />
                    <span style={{ fontSize: 13, color: status.color, fontWeight: 600 }}>
                        {status.label}
                    </span>
                </div>
            </div>

            {!supported && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        fontSize: 13,
                        marginBottom: 16,
                    }}
                >
                    <AlertCircle size={16} /> Speech recognition not supported in this browser. Use
                    Chrome/Edge.
                </div>
            )}

            {!isLive ? (
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        color: '#475569',
                    }}
                >
                    <Volume2 size={48} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 320 }}>
                        Start a live voice conversation with Gemini. Speak naturally and Gemini will
                        respond.
                    </p>
                    {session.error && (
                        <div
                            style={{
                                fontSize: 12,
                                color: '#ef4444',
                                background: 'rgba(239,68,68,0.1)',
                                padding: '8px 14px',
                                borderRadius: 8,
                            }}
                        >
                            {session.error}
                        </div>
                    )}
                    <button
                        onClick={handleStart}
                        disabled={!supported}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 24px',
                            borderRadius: 12,
                            border: 'none',
                            cursor: supported ? 'pointer' : 'not-allowed',
                            fontSize: 15,
                            fontWeight: 700,
                            background: '#4285F4',
                            color: '#fff',
                            opacity: supported ? 1 : 0.5,
                        }}
                    >
                        <Mic size={20} /> Start Live Conversation
                    </button>
                </div>
            ) : (
                <>
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            marginBottom: 12,
                            paddingRight: 4,
                        }}
                    >
                        {session.messages.map((msg, i) => (
                            <div
                                key={`${msg.role}-${i}`}
                                style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background:
                                        msg.role === 'user'
                                            ? 'rgba(66,133,244,0.15)'
                                            : 'rgba(168,85,247,0.1)',
                                    border: `1px solid ${msg.role === 'user' ? 'rgba(66,133,244,0.2)' : 'rgba(168,85,247,0.15)'}`,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: '#64748b',
                                        marginBottom: 4,
                                        fontWeight: 600,
                                    }}
                                >
                                    {msg.role === 'user' ? 'You' : 'Gemini'}
                                </div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: '#e2e8f0',
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {session.status === 'thinking' && (
                            <div
                                style={{
                                    alignSelf: 'flex-start',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 14px',
                                    color: '#3b82f6',
                                    fontSize: 13,
                                }}
                            >
                                <Loader2 size={16} className="animate-spin" /> Thinking...
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isLive && (
                            <button
                                onClick={handleStop}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#ef4444',
                                }}
                            >
                                <Square size={16} /> Stop
                            </button>
                        )}
                        <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                                placeholder="Or type a message..."
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: '#0f172a',
                                    color: '#e2e8f0',
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={handleSendText}
                                disabled={!textInput.trim()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    background: '#4285F4',
                                    color: '#fff',
                                    opacity: textInput.trim() ? 1 : 0.5,
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const GeminiLivePanel: React.FC = () => (
    <PanelLoader name="Gemini Live">
        <GeminiLivePanelContent />
    </PanelLoader>
);

export default GeminiLivePanel;
