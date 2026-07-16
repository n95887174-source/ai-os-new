import type { QueuedRequest } from '../types/chat-types';
import { EVENTS } from '../events/event-names';
import type { ChatServiceDeps } from '../contracts/chat';
import { ChatExecutor } from './chat-executor';

export class ChatService {
    private deps: ChatServiceDeps;
    private executor: ChatExecutor;
    private unsubs: Array<() => void> = [];
    private _initialized = false;

    constructor(deps: ChatServiceDeps) {
        this.deps = deps;
        this.executor = new ChatExecutor(deps, deps.llmClient);
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        this.setupListeners();
    }

    destroy() {
        this.executor.destroy();
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
    }

    private setupListeners() {
        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
                const r = req as QueuedRequest;
                this.executor.handleMessage(r);
            }),
            this.deps.eventBus.onSafe<{ requestId?: string }>(EVENTS.CANCEL_MESSAGE, (d) => {
                if (d && typeof d.requestId === 'string') this.executor.cancelRequest(d.requestId);
            }),
        );
    }
}
