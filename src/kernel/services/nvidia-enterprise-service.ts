import type {
    NvidiaEnterpriseConfig,
    ComplianceStatus,
    SLARecord,
    RegionStatus,
    EnterpriseFeature,
    INvidiaEnterpriseService,
} from '../contracts/nvidia-enterprise';

const DEFAULT_CONFIG: NvidiaEnterpriseConfig = {
    defaultRegion: 'us-central-1',
    enableCompliance: true,
    slaTarget: 99.9,
    budgetAlert: 500,
    costOptimization: true,
};

const MOCK_COMPLIANCE: ComplianceStatus[] = [
    {
        standard: 'SOC2',
        certified: true,
        certifiedSince: Date.now() - 365 * 86400000,
        expiresAt: Date.now() + 365 * 86400000,
    },
    {
        standard: 'HIPAA',
        certified: true,
        certifiedSince: Date.now() - 180 * 86400000,
        expiresAt: Date.now() + 185 * 86400000,
    },
    {
        standard: 'GDPR',
        certified: true,
        certifiedSince: Date.now() - 90 * 86400000,
        expiresAt: Date.now() + 275 * 86400000,
    },
    { standard: 'ISO27001', certified: false },
    { standard: 'PCI_DSS', certified: false },
];

const MOCK_SLA: SLARecord[] = [
    {
        period: '2026-06-24',
        uptime: 99.97,
        p50Latency: 180,
        p95Latency: 420,
        p99Latency: 890,
        totalRequests: 15234,
        errorRate: 0.03,
    },
    {
        period: '2026-06-25',
        uptime: 99.99,
        p50Latency: 165,
        p95Latency: 390,
        p99Latency: 810,
        totalRequests: 18721,
        errorRate: 0.01,
    },
    {
        period: '2026-06-26',
        uptime: 99.95,
        p50Latency: 190,
        p95Latency: 450,
        p99Latency: 920,
        totalRequests: 14309,
        errorRate: 0.05,
    },
    {
        period: '2026-06-27',
        uptime: 99.98,
        p50Latency: 170,
        p95Latency: 400,
        p99Latency: 840,
        totalRequests: 20145,
        errorRate: 0.02,
    },
    {
        period: '2026-06-28',
        uptime: 99.99,
        p50Latency: 155,
        p95Latency: 370,
        p99Latency: 780,
        totalRequests: 22890,
        errorRate: 0.01,
    },
    {
        period: '2026-06-29',
        uptime: 99.96,
        p50Latency: 185,
        p95Latency: 430,
        p99Latency: 870,
        totalRequests: 16782,
        errorRate: 0.04,
    },
    {
        period: '2026-06-30',
        uptime: 99.98,
        p50Latency: 160,
        p95Latency: 380,
        p99Latency: 800,
        totalRequests: 19567,
        errorRate: 0.02,
    },
];

const MOCK_REGIONS: RegionStatus[] = [
    {
        region: 'us-central-1',
        name: 'Iowa (US Central)',
        available: true,
        latency: 45,
        models: [
            'meta/llama-3.1-8b-instruct',
            'meta/llama-3.3-70b-instruct',
            'mistralai/mistral-nemo',
        ],
    },
    {
        region: 'us-east-1',
        name: 'N. Virginia (US East)',
        available: true,
        latency: 52,
        models: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
    },
    {
        region: 'eu-west-1',
        name: 'Ireland (EU West)',
        available: true,
        latency: 89,
        models: ['meta/llama-3.1-8b-instruct', 'mistralai/mistral-nemo'],
    },
    {
        region: 'ap-southeast-1',
        name: 'Singapore (APAC)',
        available: true,
        latency: 165,
        models: ['meta/llama-3.1-8b-instruct'],
    },
    {
        region: 'sa-east-1',
        name: 'São Paulo (South America)',
        available: false,
        latency: 0,
        models: [],
    },
];

const MOCK_FEATURES: EnterpriseFeature[] = [
    {
        id: 'audit-logging',
        name: 'Audit Logging',
        description: 'Full request/response audit trail',
        enabled: true,
        category: 'security',
    },
    {
        id: 'encryption-at-rest',
        name: 'Encryption at Rest',
        description: 'AES-256 encryption for all data',
        enabled: true,
        category: 'security',
    },
    {
        id: 'vpc-peering',
        name: 'VPC Peering',
        description: 'Private network connectivity',
        enabled: true,
        category: 'security',
    },
    {
        id: 'auto-scaling',
        name: 'Auto Scaling',
        description: 'Automatic scale based on load',
        enabled: true,
        category: 'performance',
    },
    {
        id: 'dedicated-instances',
        name: 'Dedicated Instances',
        description: 'Isolated compute resources',
        enabled: false,
        category: 'performance',
    },
    {
        id: 'cost-explorer',
        name: 'Cost Explorer',
        description: 'Granular cost breakdown and forecasts',
        enabled: true,
        category: 'management',
    },
    {
        id: 'usage-analytics',
        name: 'Usage Analytics',
        description: 'Real-time usage dashboards',
        enabled: true,
        category: 'management',
    },
    {
        id: 'compliance-reports',
        name: 'Compliance Reports',
        description: 'Automated SOC2/HIPAA reports',
        enabled: false,
        category: 'compliance',
    },
];

/**
 * @deprecated MOCK — simulated backend. Replace with real implementation before production use.
 */
export class NvidiaEnterpriseService implements INvidiaEnterpriseService {
    private config: NvidiaEnterpriseConfig = { ...DEFAULT_CONFIG };
    private features: EnterpriseFeature[] = MOCK_FEATURES.map((f) => ({ ...f }));

    getConfig(): NvidiaEnterpriseConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<NvidiaEnterpriseConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    getCompliance(): ComplianceStatus[] {
        return MOCK_COMPLIANCE.map((c) => ({ ...c }));
    }

    getSLAHistory(): SLARecord[] {
        return MOCK_SLA.map((s) => ({ ...s }));
    }

    getRegions(): RegionStatus[] {
        return MOCK_REGIONS.map((r) => ({ ...r }));
    }

    getFeatures(): EnterpriseFeature[] {
        return this.features.map((f) => ({ ...f }));
    }

    toggleFeature(id: string, enabled: boolean): void {
        const f = this.features.find((x) => x.id === id);
        if (f) f.enabled = enabled;
    }

    getEstimatedCosts(): { model: string; costPer1k: number; usage: number; total: number }[] {
        return [
            { model: 'llama-3.1-8b-instruct', costPer1k: 0.0005, usage: 4523000, total: 2.26 },
            { model: 'llama-3.3-70b-instruct', costPer1k: 0.002, usage: 1201000, total: 2.4 },
            { model: 'mistral-nemo-12b', costPer1k: 0.001, usage: 890000, total: 0.89 },
        ];
    }
}
