import type { IGeminiLiveService, GeminiLiveSession } from '../contracts/gemini-live';
import { googleGenAIService } from '../instances';
import { rootLogger } from './logger-service';
import { PROVIDER_DEFAULT_MODELS } from '../utils/provider-default-models';

const LOGGER = rootLogger.child('GeminiLive');

let _cid = 0;
const genId = () => `glive-${++_cid}-${Date.now()}`;

function getSpeechRecognition(): { new (): SpeechRecognition } | null {
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition || w.webkitSpeechRecognition) as {
        new (): SpeechRecognition;
    } | null;
}

export class GeminiLiveService implements IGeminiLiveService {
    private static MAX_MESSAGES = 100;
    private session: GeminiLiveSession = {
        id: genId(),
        status: 'idle',
        messages: [],
        startedAt: Date.now(),
    };

    private recognition: SpeechRecognition | null = null;
    private synth: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;
    private aborted = false;

    isSupported(): boolean {
        return !!(
            typeof window !== 'undefined' &&
            getSpeechRecognition() &&
            window.speechSynthesis
        );
    }

    getSession(): GeminiLiveSession {
        return { ...this.session, messages: [...this.session.messages] };
    }

    async start(): Promise<void> {
        if (!this.isSupported()) {
            this.session = { ...this.session, status: 'error', error: 'Speech API not supported' };
            return;
        }
        if (!googleGenAIService.isConfigured) {
            this.session = { ...this.session, status: 'error', error: 'Set Google API key first' };
            return;
        }
        if (this.recognition) {
            LOGGER.warn(
                'GeminiLive',
                'start() called while already running — stopping previous session',
            );
            this.stop();
        }
        this.aborted = false;
        this.session = { id: genId(), status: 'listening', messages: [], startedAt: Date.now() };

        this.synth = window.speechSynthesis;
        this.voice = this.synth.getVoices().find((v) => v.lang.startsWith('en')) || null;

        const Ctor = getSpeechRecognition();
        if (!Ctor) {
            this.session = {
                ...this.session,
                status: 'error',
                error: 'SpeechRecognition not found',
            };
            return;
        }
        this.recognition = new Ctor();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            const last = event.results[event.results.length - 1];
            if (last.isFinal) {
                const t = last[0].transcript.trim();
                if (t) this.handleUserInput(t);
            }
        };

        this.recognition.onerror = () => {
            this.session = { ...this.session, status: 'error', error: 'Microphone error' };
        };

        this.recognition.onend = () => {
            if (!this.aborted && this.session.status !== 'error') {
                setTimeout(() => this.recognition?.start(), 100);
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            this.session = { ...this.session, status: 'error', error: String(e) };
        }
    }

    stop(): void {
        this.aborted = true;
        this.recognition?.stop();
        this.synth?.cancel();
        this.recognition = null;
        this.session = { ...this.session, status: 'idle' };
    }

    async sendText(text: string): Promise<void> {
        await this.handleUserInput(text);
    }

    private async handleUserInput(text: string): Promise<void> {
        const recentMessages =
            this.session.messages.length >= GeminiLiveService.MAX_MESSAGES
                ? this.session.messages.slice(-GeminiLiveService.MAX_MESSAGES + 2)
                : this.session.messages;
        const msgs = [...recentMessages, { role: 'user' as const, text, timestamp: Date.now() }];
        this.session = { ...this.session, messages: msgs, status: 'thinking' };

        if (this.synth?.speaking) {
            this.synth.cancel();
        }

        const chatMessages = [{ role: 'user' as const, content: text }];

        try {
            let fullText = '';
            const result = await googleGenAIService.streamContent(
                chatMessages,
                (chunk) => {
                    fullText += chunk;
                },
                PROVIDER_DEFAULT_MODELS.gemini,
            );

            const responseText = result.content || result.error || '(no response)';
            if (!fullText) fullText = responseText;

            this.session = {
                ...this.session,
                messages: [
                    ...this.session.messages,
                    { role: 'model', text: responseText, timestamp: Date.now() },
                ],
            };

            if (this.synth) {
                this.session = { ...this.session, status: 'speaking' };
                const u = new SpeechSynthesisUtterance(fullText);
                if (this.voice) u.voice = this.voice;
                u.rate = 1.1;
                u.onend = () => {
                    if (!this.aborted) this.session = { ...this.session, status: 'listening' };
                };
                this.synth.speak(u);
            } else if (!this.aborted) {
                this.session = { ...this.session, status: 'listening' };
            }
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            LOGGER.error('GeminiLive', 'LLM call failed', { error: errMsg });
            this.session = { ...this.session, status: 'error', error: errMsg };
        }
    }
}
