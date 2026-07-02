import React, { useState, useCallback, useRef, useEffect } from 'react';
import { googleGenAIService } from '../../kernel/services/google-genai-service';
import {
    Shield,
    Brain,
    Image,
    Send,
    StopCircle,
    Globe,
    Loader2,
    CheckCircle2,
    XCircle,
    Building2,
    Database,
} from 'lucide-react';
import type { ChatMessage, ProviderResponse } from '../../kernel/types/llm-types';

type TabId = 'chat' | 'grounding' | 'thinking' | 'multimodal' | 'imagen' | 'vertex';

interface GoogleStudioMessage {
    role: 'user' | 'model';
    text: string;
    grounding?: ProviderResponse['groundingMetadata'];
}

export function GoogleStudioPanel() {
    const [apiKey, setApiKey] = useState('');
    const [configured, setConfigured] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('chat');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [messages, setMessages] = useState<GoogleStudioMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [thinkingEnabled, setThinkingEnabled] = useState(false);
    const [groundingEnabled, setGroundingEnabled] = useState(false);
    const [imageBase64, setImageBase64] = useState('');
    const [imageMime, setImageMime] = useState('');
    const [result, setResult] = useState<ProviderResponse | null>(null);
    const [error, setError] = useState('');
    const [imagenPrompt, setImagenPrompt] = useState('');
    const [imagenImages, setImagenImages] = useState<string[]>([]);
    const [imagenLoading, setImagenLoading] = useState(false);
    const [vertexDatastore, setVertexDatastore] = useState('');
    const [vertexDynamicThreshold, setVertexDynamicThreshold] = useState(0.5);
    const [vertexDynamicMode, setVertexDynamicMode] = useState<'MODE_DYNAMIC' | 'MODE_STATIC'>(
        'MODE_DYNAMIC',
    );
    const [vertexResult, setVertexResult] = useState<ProviderResponse | null>(null);
    const [vertexLoading, setVertexLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleConfigure = useCallback(() => {
        if (!apiKey.trim()) return;
        googleGenAIService.setApiKey(apiKey.trim());
        setConfigured(true);
        setError('');
    }, [apiKey]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            setImageBase64(base64);
            setImageMime(file.type);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleSend = useCallback(async () => {
        if (!input.trim() && !imageBase64) return;
        setError('');

        const userMsg: GoogleStudioMessage = {
            role: 'user',
            text: input,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setStreaming(true);
        setLoading(true);

        const abort = new AbortController();
        abortRef.current = abort;

        const chatMessages: ChatMessage[] = [
            {
                role: 'user',
                content: input,
                inlineData: imageBase64 ? [{ mimeType: imageMime, data: imageBase64 }] : undefined,
            },
        ];

        try {
            const result = await googleGenAIService.generateContent(
                chatMessages,
                model,
                {
                    thinkingConfig: thinkingEnabled ? { type: 'ENABLED' } : undefined,
                    googleSearchGrounding: groundingEnabled,
                },
                abort.signal,
            );

            setResult(result);
            setMessages((prev) => [
                ...prev,
                { role: 'model', text: result.content, grounding: result.groundingMetadata },
            ]);
            setImageBase64('');
            setImageMime('');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setStreaming(false);
            setLoading(false);
            abortRef.current = null;
        }
    }, [input, model, thinkingEnabled, groundingEnabled, imageBase64, imageMime]);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
        setStreaming(false);
        setLoading(false);
    }, []);

    const handleTestGrounding = useCallback(async () => {
        setLoading(true);
        setError('');
        const abort = new AbortController();
        abortRef.current = abort;

        const testMessages: ChatMessage[] = [
            {
                role: 'user',
                content: 'What are the latest developments in AI in 2026? Include citations.',
            },
        ];
        try {
            const r = await googleGenAIService.generateContent(
                testMessages,
                model,
                { googleSearchGrounding: true },
                abort.signal,
            );
            setResult(r);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [model]);

    const handleGenerateImage = useCallback(async () => {
        if (!imagenPrompt.trim()) return;
        setImagenLoading(true);
        setError('');
        try {
            const result = await googleGenAIService.generateImage(imagenPrompt.trim());
            setImagenImages(result.images);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setImagenLoading(false);
        }
    }, [imagenPrompt]);

    const handleTestVertexSearch = useCallback(async () => {
        setVertexLoading(true);
        setError('');
        const abort = new AbortController();
        abortRef.current = abort;

        const testMessages: ChatMessage[] = [
            {
                role: 'user',
                content:
                    'What information is available in our enterprise knowledge base about this topic?',
            },
        ];
        try {
            const r = await googleGenAIService.generateContent(
                testMessages,
                model,
                {
                    vertexSearchGrounding: {
                        datastore: vertexDatastore.trim() || undefined,
                        dynamicRetrievalConfig: {
                            mode: vertexDynamicMode,
                            dynamicThreshold: vertexDynamicThreshold,
                        },
                    },
                },
                abort.signal,
            );
            setVertexResult(r);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setVertexLoading(false);
            abortRef.current = null;
        }
    }, [model, vertexDatastore, vertexDynamicMode, vertexDynamicThreshold]);

    const handleTestThinking = useCallback(async () => {
        setLoading(true);
        setError('');
        const abort = new AbortController();
        abortRef.current = abort;

        const testMessages: ChatMessage[] = [
            {
                role: 'user',
                content:
                    'Solve a complex multi-step reasoning problem: A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain your reasoning step by step.',
            },
        ];
        try {
            const r = await googleGenAIService.generateContent(
                testMessages,
                model,
                { thinkingConfig: { type: 'ENABLED' } },
                abort.signal,
            );
            setResult(r);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [model]);

    if (!configured) {
        return (
            <div style={{ padding: '32px', maxWidth: 600, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <Shield size={32} color="#4285F4" />
                    <div>
                        <h2 style={{ margin: 0 }}>Google Studio</h2>
                        <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
                            Google GenAI SDK integration — Multimodal · Thinking · Grounding
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        padding: 24,
                        border: '1px solid #2a2a4e',
                    }}
                >
                    <label
                        style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}
                    >
                        Gemini API Key
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIza..."
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid #333',
                                background: '#0d0d1a',
                                color: '#fff',
                                fontSize: 14,
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfigure()}
                        />
                        <button
                            onClick={handleConfigure}
                            disabled={!apiKey.trim()}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#4285F4',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 600,
                                opacity: apiKey.trim() ? 1 : 0.5,
                            }}
                        >
                            Connect
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                        Your key stays local. Uses the official Google GenAI SDK.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Shield size={28} color="#4285F4" />
                <div>
                    <h2 style={{ margin: 0 }}>Google Studio</h2>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: 12 }}>
                        SDK v0.24.1 · {model}
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #333',
                            background: '#0d0d1a',
                            color: '#fff',
                            fontSize: 13,
                        }}
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    </select>
                    <button
                        onClick={() => {
                            setConfigured(false);
                            setApiKey('');
                        }}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #333',
                            background: 'transparent',
                            color: '#888',
                            cursor: 'pointer',
                            fontSize: 12,
                        }}
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            {/* Feature Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                    { id: 'chat' as const, label: 'Chat', icon: Send },
                    { id: 'grounding' as const, label: 'Grounding', icon: Globe },
                    { id: 'thinking' as const, label: 'Thinking', icon: Brain },
                    { id: 'multimodal' as const, label: 'Multimodal', icon: Image },
                    { id: 'imagen' as const, label: 'Imagen', icon: Image },
                    { id: 'vertex' as const, label: 'Vertex Search', icon: Building2 },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: activeTab === tab.id ? '2px solid #4285F4' : '1px solid #333',
                            background:
                                activeTab === tab.id ? 'rgba(66,133,244,0.1)' : 'transparent',
                            color: activeTab === tab.id ? '#4285F4' : '#888',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: activeTab === tab.id ? 600 : 400,
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'chat' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        overflow: 'hidden',
                    }}
                >
                    {/* Messages */}
                    <div style={{ height: 400, overflowY: 'auto', padding: 16 }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
                                <Send size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                <p>Send a message to Gemini via the SDK</p>
                                <p style={{ fontSize: 12 }}>
                                    Supports: Thinking {thinkingEnabled ? '✅' : '❌'} · Grounding{' '}
                                    {groundingEnabled ? '✅' : '❌'}
                                </p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                style={{
                                    marginBottom: 12,
                                    display: 'flex',
                                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                    gap: 8,
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '75%',
                                        padding: '10px 14px',
                                        borderRadius: 12,
                                        background: msg.role === 'user' ? '#4285F4' : '#2a2a4e',
                                        color: '#fff',
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color:
                                                msg.role === 'user'
                                                    ? 'rgba(255,255,255,0.7)'
                                                    : '#888',
                                            marginBottom: 4,
                                        }}
                                    >
                                        {msg.role === 'user' ? 'You' : 'Gemini'}
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                    {msg.grounding?.webSearchQueries &&
                                        msg.grounding.webSearchQueries.length > 0 && (
                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    padding: 8,
                                                    background: 'rgba(0,0,0,0.2)',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                }}
                                            >
                                                <Globe
                                                    size={12}
                                                    style={{
                                                        marginRight: 4,
                                                        verticalAlign: 'middle',
                                                    }}
                                                />
                                                Grounded:{' '}
                                                {msg.grounding.webSearchQueries.join(', ')}
                                                {msg.grounding.groundingChunks?.map(
                                                    (chunk, ci) =>
                                                        chunk.web && (
                                                            <div key={ci} style={{ marginTop: 4 }}>
                                                                <a
                                                                    href={chunk.web.uri}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        color: '#8ab4f8',
                                                                        textDecoration: 'none',
                                                                    }}
                                                                >
                                                                    ↑ {chunk.web.title}
                                                                </a>
                                                            </div>
                                                        ),
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 12,
                                    color: '#888',
                                }}
                            >
                                <Loader2 size={16} className="animate-spin" />
                                Generating...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a4e' }}>
                        <div
                            style={{
                                display: 'flex',
                                gap: 12,
                                marginBottom: 8,
                                fontSize: 12,
                                alignItems: 'center',
                            }}
                        >
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={thinkingEnabled}
                                    onChange={(e) => setThinkingEnabled(e.target.checked)}
                                />
                                <Brain size={14} /> Thinking
                            </label>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={groundingEnabled}
                                    onChange={(e) => setGroundingEnabled(e.target.checked)}
                                />
                                <Globe size={14} /> Google Search
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="Message Gemini..."
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: '1px solid #333',
                                    background: '#0d0d1a',
                                    color: '#fff',
                                    fontSize: 14,
                                }}
                            />
                            {streaming ? (
                                <button
                                    onClick={handleStop}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <StopCircle size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#4285F4',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        opacity: input.trim() ? 1 : 0.5,
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'grounding' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        padding: 24,
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                        <Globe size={20} color="#34A853" />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Google Search Grounding</h3>
                    </div>
                    <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                        Gemini can search the web in real-time to provide accurate, up-to-date
                        answers with citations. Uses{' '}
                        <code
                            style={{ background: '#0d0d1a', padding: '2px 6px', borderRadius: 4 }}
                        >
                            tools: [{'{'}googleSearch: {'{}{}'} {'}'}]
                        </code>
                    </p>
                    <button
                        onClick={handleTestGrounding}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#34A853',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null} Test
                        Grounding
                    </button>
                    {result?.groundingMetadata && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: 16,
                                background: '#0d0d1a',
                                borderRadius: 8,
                            }}
                        >
                            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Grounding Result</h4>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: '#ccc',
                                    whiteSpace: 'pre-wrap',
                                    marginBottom: 12,
                                }}
                            >
                                {result.content}
                            </div>
                            {result.groundingMetadata.webSearchQueries?.map((q, i) => (
                                <div
                                    key={i}
                                    style={{ fontSize: 12, color: '#8ab4f8', marginBottom: 4 }}
                                >
                                    Search: {q}
                                </div>
                            ))}
                            {result.groundingMetadata.groundingChunks?.map(
                                (chunk, i) =>
                                    chunk.web && (
                                        <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>
                                            <a
                                                href={chunk.web.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#8ab4f8' }}
                                            >
                                                {chunk.web.title}
                                            </a>
                                        </div>
                                    ),
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'thinking' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        padding: 24,
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                        <Brain size={20} color="#FBBC04" />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Deep Thinking (Gemini 2.5)</h3>
                    </div>
                    <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                        Enables chain-of-thought reasoning for complex multi-step problems. Uses{' '}
                        <code
                            style={{ background: '#0d0d1a', padding: '2px 6px', borderRadius: 4 }}
                        >
                            thinkingConfig: {'{'}type: "ENABLED"{'}'}
                        </code>
                    </p>
                    <button
                        onClick={handleTestThinking}
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#FBBC04',
                            color: '#000',
                            cursor: 'pointer',
                            fontWeight: 600,
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null} Test Deep
                        Thinking
                    </button>
                    {result && !loading && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: 16,
                                background: '#0d0d1a',
                                borderRadius: 8,
                            }}
                        >
                            <div style={{ fontSize: 13, color: '#ccc', whiteSpace: 'pre-wrap' }}>
                                {result.content}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'imagen' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        padding: 24,
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                        <Image size={20} color="#4285F4" />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Imagen Image Generation</h3>
                    </div>
                    <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                        Generate images from text prompts using{' '}
                        <code
                            style={{ background: '#0d0d1a', padding: '2px 6px', borderRadius: 4 }}
                        >
                            imagen-3.0-generate-001
                        </code>
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input
                            value={imagenPrompt}
                            onChange={(e) => setImagenPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
                            placeholder="A serene mountain lake at sunset, digital art..."
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid #333',
                                background: '#0d0d1a',
                                color: '#fff',
                                fontSize: 14,
                            }}
                        />
                        <button
                            onClick={handleGenerateImage}
                            disabled={!imagenPrompt.trim() || imagenLoading}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#4285F4',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 600,
                                opacity: !imagenPrompt.trim() || imagenLoading ? 0.5 : 1,
                            }}
                        >
                            {imagenLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                'Generate'
                            )}
                        </button>
                    </div>
                    {imagenImages.length > 0 && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: 16,
                            }}
                        >
                            {imagenImages.map((img, i) => (
                                <div
                                    key={i}
                                    style={{
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: '1px solid #333',
                                        background: '#0d0d1a',
                                    }}
                                >
                                    <img
                                        src={`data:image/png;base64,${img}`}
                                        alt={`Generated ${i + 1}`}
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                    <div
                                        style={{ padding: '8px 12px', fontSize: 11, color: '#666' }}
                                    >
                                        Imagen · {i + 1}/{imagenImages.length}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {imagenImages.length === 0 && !imagenLoading && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                            <Image size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 13 }}>Enter a prompt to generate an image</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'multimodal' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        padding: 24,
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                        <Image size={20} color="#EA4335" />
                        <h3 style={{ margin: 0, fontSize: 16 }}>Multimodal I/O</h3>
                    </div>
                    <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                        Send images to Gemini for analysis. Uses{' '}
                        <code
                            style={{ background: '#0d0d1a', padding: '2px 6px', borderRadius: 4 }}
                        >
                            inlineData
                        </code>{' '}
                        in SDK parts.
                    </p>
                    <div
                        style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ fontSize: 13, color: '#888' }}
                        />
                        {imageBase64 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} color="#34A853" />
                                <span style={{ fontSize: 12, color: '#888' }}>
                                    Image loaded ({Math.round((imageBase64.length * 3) / 4 / 1024)}
                                    KB)
                                </span>
                                <button
                                    onClick={() => {
                                        setImageBase64('');
                                        setImageMime('');
                                    }}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        border: '1px solid #333',
                                        background: 'transparent',
                                        color: '#888',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about the image..."
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: 8,
                                border: '1px solid #333',
                                background: '#0d0d1a',
                                color: '#fff',
                                fontSize: 14,
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() && !imageBase64}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#4285F4',
                                color: '#fff',
                                cursor: 'pointer',
                                opacity: input.trim() || imageBase64 ? 1 : 0.5,
                            }}
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'vertex' && (
                <div
                    style={{
                        background: '#1a1a2e',
                        borderRadius: 12,
                        border: '1px solid #2a2a4e',
                        padding: 24,
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
                    >
                        <Building2 size={20} color="#4285F4" />
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16 }}>Vertex AI Search Grounding</h3>
                            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 12 }}>
                                Enterprise grounding against private data sources via Vertex AI
                                Search
                            </p>
                        </div>
                    </div>

                    {/* Config Section */}
                    <div
                        style={{
                            marginBottom: 20,
                            padding: 16,
                            background: '#0d0d1a',
                            borderRadius: 8,
                            fontSize: 13,
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', marginBottom: 4, color: '#aaa' }}>
                                Vertex AI Search Datastore{' '}
                                <span style={{ color: '#666' }}>
                                    (optional — leave empty for googleSearchRetrieval)
                                </span>
                            </label>
                            <input
                                value={vertexDatastore}
                                onChange={(e) => setVertexDatastore(e.target.value)}
                                placeholder="projects/.../locations/global/collections/default_collection/dataStores/my-datastore"
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: '1px solid #333',
                                    background: '#0d0d1a',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                }}
                            />
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                gap: 16,
                                alignItems: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: 4,
                                        color: '#aaa',
                                        fontSize: 12,
                                    }}
                                >
                                    Retrieval Mode
                                </label>
                                <select
                                    value={vertexDynamicMode}
                                    onChange={(e) =>
                                        setVertexDynamicMode(
                                            e.target.value as 'MODE_DYNAMIC' | 'MODE_STATIC',
                                        )
                                    }
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #333',
                                        background: '#0d0d1a',
                                        color: '#fff',
                                        fontSize: 12,
                                    }}
                                >
                                    <option value="MODE_DYNAMIC">Dynamic</option>
                                    <option value="MODE_STATIC">Static</option>
                                </select>
                            </div>
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        marginBottom: 4,
                                        color: '#aaa',
                                        fontSize: 12,
                                    }}
                                >
                                    Dynamic Threshold: {vertexDynamicThreshold.toFixed(2)}
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={vertexDynamicThreshold}
                                    onChange={(e) =>
                                        setVertexDynamicThreshold(parseFloat(e.target.value))
                                    }
                                    style={{ width: 140, verticalAlign: 'middle' }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleTestVertexSearch}
                        disabled={vertexLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#4285F4',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            opacity: vertexLoading ? 0.5 : 1,
                        }}
                    >
                        {vertexLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Database size={16} />
                        )}
                        Test Vertex Search Grounding
                    </button>

                    {vertexResult && !vertexLoading && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: 16,
                                background: '#0d0d1a',
                                borderRadius: 8,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: 8,
                                }}
                            >
                                <h4 style={{ margin: 0, fontSize: 14 }}>Result</h4>
                                <span style={{ fontSize: 11, color: '#666' }}>
                                    {vertexResult.latency}ms · {vertexResult.tokens} tokens
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: '#ccc',
                                    whiteSpace: 'pre-wrap',
                                    marginBottom: 12,
                                }}
                            >
                                {vertexResult.content || (
                                    <span style={{ color: '#ef4444' }}>
                                        {vertexResult.error || 'No content returned'}
                                    </span>
                                )}
                            </div>
                            {vertexResult.groundingMetadata?.webSearchQueries && (
                                <div style={{ fontSize: 12, color: '#8ab4f8', marginBottom: 8 }}>
                                    Search queries:{' '}
                                    {vertexResult.groundingMetadata.webSearchQueries.join(', ')}
                                </div>
                            )}
                            {vertexResult.groundingMetadata?.groundingChunks?.map((chunk, i) => (
                                <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>
                                    {chunk.web && (
                                        <a
                                            href={chunk.web.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#8ab4f8' }}
                                        >
                                            {chunk.web.title}
                                        </a>
                                    )}
                                    {chunk.retrievedContext && (
                                        <span style={{ color: '#34A853' }}>
                                            {chunk.retrievedContext.title}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {!vertexResult && !vertexLoading && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                            <Building2 size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontSize: 13 }}>
                                Test Vertex Search grounding against your enterprise data
                            </p>
                            <p style={{ fontSize: 11 }}>
                                Uses{' '}
                                <code
                                    style={{
                                        background: '#0d0d1a',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                    }}
                                >
                                    googleSearchRetrieval
                                </code>{' '}
                                or{' '}
                                <code
                                    style={{
                                        background: '#0d0d1a',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                    }}
                                >
                                    vertexAiSearch
                                </code>{' '}
                                tool
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div
                    style={{
                        marginTop: 16,
                        padding: 12,
                        background: 'rgba(239,68,68,0.1)',
                        borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: '#ef4444',
                    }}
                >
                    <XCircle size={16} />
                    {error}
                </div>
            )}
        </div>
    );
}

export default GoogleStudioPanel;
