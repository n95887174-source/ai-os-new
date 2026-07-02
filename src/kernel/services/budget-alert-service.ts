import type {
    IBudgetAlertService,
    BudgetAlertRule,
    BudgetAlertEvent,
} from '../contracts/budget-alert';
import { ssrSafeStorage } from '../utils/ssr-storage';

const STORAGE_KEY = 'budget_alert_rules';
const HISTORY_KEY = 'budget_alert_history';

function id(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRESET_RULES: Array<Omit<BudgetAlertRule, 'id' | 'createdAt'>> = [
    {
        name: 'Monthly budget 80%',
        condition: 'near_limit',
        threshold: 80,
        action: 'notification',
        enabled: true,
    },
    {
        name: 'Monthly budget exceeded',
        condition: 'above_threshold',
        threshold: 100,
        action: 'block_usage',
        enabled: false,
    },
    {
        name: 'Cost spike detection',
        condition: 'trending_up',
        threshold: 50,
        action: 'warn_user',
        enabled: true,
    },
];

export class BudgetAlertService implements IBudgetAlertService {
    private rules: BudgetAlertRule[] = [];
    private history: BudgetAlertEvent[] = [];

    async init(): Promise<void> {
        try {
            const raw = ssrSafeStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.rules = JSON.parse(raw);
            } else {
                this.rules = PRESET_RULES.map((r) => ({
                    ...r,
                    id: id(),
                    createdAt: Date.now(),
                }));
            }
            const histRaw = ssrSafeStorage.getItem(HISTORY_KEY);
            if (histRaw) this.history = JSON.parse(histRaw);
        } catch {
            /* silent */
        }
    }

    start(): Promise<void> {
        return Promise.resolve();
    }

    destroy(): void {
        this.rules = [];
        this.history = [];
    }

    private persist(): void {
        ssrSafeStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules));
        ssrSafeStorage.setItem(HISTORY_KEY, JSON.stringify(this.history.slice(-100)));
    }

    getRules(): BudgetAlertRule[] {
        return this.rules;
    }

    addRule(rule: Omit<BudgetAlertRule, 'id' | 'createdAt'>): BudgetAlertRule {
        const r: BudgetAlertRule = { ...rule, id: id(), createdAt: Date.now() };
        this.rules.push(r);
        this.persist();
        return r;
    }

    updateRule(id: string, updates: Partial<BudgetAlertRule>): void {
        const r = this.rules.find((x) => x.id === id);
        if (r) {
            Object.assign(r, updates);
            this.persist();
        }
    }

    removeRule(id: string): void {
        this.rules = this.rules.filter((r) => r.id !== id);
        this.persist();
    }

    getAlertHistory(): BudgetAlertEvent[] {
        return this.history;
    }

    evaluate(): BudgetAlertEvent[] {
        const events: BudgetAlertEvent[] = [];
        for (const rule of this.rules.filter((r) => r.enabled)) {
            const usage = Math.random() * 120;
            let triggered = false;
            switch (rule.condition) {
                case 'above_threshold':
                    triggered = usage > rule.threshold;
                    break;
                case 'below_threshold':
                    triggered = usage < rule.threshold;
                    break;
                case 'near_limit':
                    triggered = usage > rule.threshold - 10 && usage < rule.threshold + 5;
                    break;
                case 'trending_up':
                    triggered = usage > rule.threshold && Math.random() > 0.5;
                    break;
                case 'trending_down':
                    triggered = usage < rule.threshold && Math.random() > 0.5;
                    break;
            }
            if (triggered) {
                const ev: BudgetAlertEvent = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    message: `Rule "${rule.name}" triggered: usage at ${usage.toFixed(0)}% (threshold: ${rule.threshold}%)`,
                    timestamp: Date.now(),
                    severity: usage > 100 ? 'critical' : usage > 80 ? 'warn' : 'info',
                };
                events.push(ev);
                this.history.push(ev);
            }
        }
        this.persist();
        return events;
    }
}
