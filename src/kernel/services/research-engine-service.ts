import { genId } from '../../utils/gen-id';
import type {
    IResearchEngine,
    ResearchSession,
    EpistemicLoopResult,
    ResearchQuestion,
    ResearchSource,
    ResearchClaim,
    ResearchSynthesis,
    CitationGraph,
    CitationNode,
    CitationLink,
    KnowledgeGraph,
    KnowledgeEntity,
    KnowledgeRelation,
    KnowledgeCluster,
    SystematicReview,
    SystematicReviewConfig,
    PrismaFlow,
    BiasAssessment,
    FactCheckReport,
    FactCheckResult,
    AnomalyReport,
    ResearchAnomaly,
    SummarizationResult,
    SummaryStyle,
    SummaryLength,
    CitationExport,
    CitationEntry,
    CitationFormat,
    PeerReview,
    PeerReviewComment,
    DiscoveryResult,
    DiscoveryTopic,
    ResearchReport,
    ReportFormat,
} from '../contracts/research-engine';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import { sourceAdapterRegistry } from '../instances';
import type { SourceAdapterConfig } from '../contracts/research-adapter';
import type { SourceType } from '../contracts/research-engine';

const LOGGER = rootLogger.child('ResearchEngine');
const MAX_SESSIONS = 50;

export class ResearchEngineService implements IResearchEngine {
    private sessions: Map<string, ResearchSession> = new Map();
    private citationGraphs: Map<string, CitationGraph> = new Map();
    private knowledgeGraphs: Map<string, KnowledgeGraph> = new Map();
    private systematicReviews: Map<string, SystematicReview> = new Map();
    private factCheckReports: Map<string, FactCheckReport> = new Map();
    private anomalyReports: Map<string, AnomalyReport> = new Map();
    private summarizations: Map<string, SummarizationResult[]> = new Map();
    private citationExports: Map<string, CitationExport> = new Map();
    private peerReviews: Map<string, PeerReview> = new Map();
    private _discoveryResult: DiscoveryResult | null = null;
    private researchReports: Map<string, ResearchReport> = new Map();
    private _initialized = false;

    constructor(
        private deps: {
            eventBus: { emit: (event: string, data?: unknown) => void };
        },
    ) {
        // Source adapter registry is initialized as a singleton
        // Can be configured via updateSourceConfig()
    }

    getSourceAdapterRegistry() {
        return sourceAdapterRegistry;
    }

    updateSourceConfig(config: Partial<SourceAdapterConfig>): void {
        sourceAdapterRegistry.updateConfig(config);
    }

    getEnabledSources(): SourceType[] {
        return sourceAdapterRegistry.getConfig().enabledSources;
    }

    getSourceStats(): { total: number; enabled: number; byCategory: Record<string, number> } {
        const all = sourceAdapterRegistry.getAllAdapters();
        const enabled = sourceAdapterRegistry.getEnabledAdapters();
        const byCategory: Record<string, number> = {};
        for (const a of all) {
            byCategory[a.category] = (byCategory[a.category] || 0) + 1;
        }
        return {
            total: all.length,
            enabled: enabled.length,
            byCategory,
        };
    }

    async init(): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;
        LOGGER.info('ResearchEngine', 'Research Engine initialized');
    }

    async start(): Promise<void> {
        LOGGER.info('ResearchEngine', 'Research Engine started');
    }

    async destroy(): Promise<void> {
        this._initialized = false;
        this.sessions.clear();
        this.citationGraphs.clear();
        this.knowledgeGraphs.clear();
        this.systematicReviews.clear();
        this.factCheckReports.clear();
        this.anomalyReports.clear();
        this.summarizations.clear();
        this.citationExports.clear();
        this.peerReviews.clear();
        this._discoveryResult = null;
        this.researchReports.clear();
    }

    async startSession(title: string, question: string): Promise<string> {
        const id = genId('rs');
        const session: ResearchSession = {
            id,
            title,
            initialQuestion: question,
            loops: [],
            status: 'idle',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.sessions.set(id, session);
        this.trimSessions();
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, {
            action: 'session_started',
            sessionId: id,
        });
        return id;
    }

    getSession(id: string): ResearchSession | undefined {
        return this.sessions.get(id);
    }

    getAllSessions(): ResearchSession[] {
        return Array.from(this.sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    async runLoop(sessionId: string): Promise<EpistemicLoopResult> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const questionText = this.getNextQuestion(session);
        const question: ResearchQuestion = {
            id: genId('rq'),
            text: questionText,
            parentId:
                session.loops.length > 0
                    ? session.loops[session.loops.length - 1].question.id
                    : null,
            depth: session.loops.length,
            timestamp: Date.now(),
        };

        const result: EpistemicLoopResult = {
            question,
            sources: [],
            claims: [],
            synthesis: null,
            status: 'formulating',
            startedAt: Date.now(),
        };

        try {
            result.status = 'searching';
            const sources = await this.searchSources(questionText);
            result.sources = sources;

            result.status = 'extracting';
            const claims = this.extractClaims(sources, questionText);
            result.claims = claims;

            result.status = 'synthesizing';
            const synthesis = this.synthesize(claims, questionText);
            result.synthesis = synthesis;

            result.status = 'complete';
            result.completedAt = Date.now();
        } catch (e) {
            result.status = 'error';
            result.error = e instanceof Error ? e.message : String(e);
            result.completedAt = Date.now();
            LOGGER.error('ResearchEngine', 'Loop failed', { sessionId, error: result.error });
        }

        session.loops.push(result);
        session.status = result.status;
        session.updatedAt = Date.now();
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, { action: 'loop_completed', sessionId });
        return result;
    }

    deleteSession(id: string): void {
        this.sessions.delete(id);
        this.citationGraphs.delete(id);
        this.knowledgeGraphs.delete(id);
        this.systematicReviews.delete(id);
        this.factCheckReports.delete(id);
        this.anomalyReports.delete(id);
        this.summarizations.delete(id);
        this.citationExports.delete(id);
        this.peerReviews.delete(id);
        this.researchReports.delete(id);
        this.deps.eventBus.emit(EVENTS.HYPOTHESES_UPDATED, {
            action: 'session_deleted',
            sessionId: id,
        });
    }

    clearHistory(): void {
        this.sessions.clear();
        this.citationGraphs.clear();
        this.knowledgeGraphs.clear();
        this.systematicReviews.clear();
        this.factCheckReports.clear();
        this.anomalyReports.clear();
        this.summarizations.clear();
        this.citationExports.clear();
        this.peerReviews.clear();
        this.researchReports.clear();
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: Citation Graph
    // ═══════════════════════════════════════════════════════════

    async buildCitationGraph(sessionId: string): Promise<CitationGraph> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allClaims = session.loops.flatMap((l) => l.claims);
        const allSources = session.loops.flatMap((l) => l.sources);

        const nodes: CitationNode[] = allSources.map((s) => ({
            id: s.id,
            title: s.title,
            authors: s.authors && s.authors.length > 0 ? s.authors : ['Unknown'],
            year: s.year ?? new Date(s.timestamp).getFullYear(),
            source: s.sourceType,
            citationsCount: s.citationCount ?? 0,
            influenceScore:
                s.relevanceScore *
                (allClaims.filter((c) => c.sourceId === s.id).length /
                    Math.max(1, allClaims.length)),
        }));

        const links: CitationLink[] = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const claimsI = allClaims.filter((c) => c.sourceId === nodes[i].id);
                for (const ci of claimsI) {
                    if (ci.contradictions.length > 0) {
                        links.push({ source: nodes[i].id, target: nodes[j].id, weight: 0.3 });
                        break;
                    }
                }
            }
        }

        const citationGraph: CitationGraph = {
            nodes,
            links,
            totalPapers: nodes.length,
            totalCitations: nodes.reduce((s, n) => s + n.citationsCount, 0),
            avgInfluence:
                nodes.length > 0
                    ? nodes.reduce((s, n) => s + n.influenceScore, 0) / nodes.length
                    : 0,
            hIndex: 0,
        };

        this.citationGraphs.set(sessionId, citationGraph);
        return citationGraph;
    }

    getCitationGraph(sessionId: string): CitationGraph | undefined {
        return this.citationGraphs.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 6: Knowledge Graph
    // ═══════════════════════════════════════════════════════════

    async buildKnowledgeGraph(sessionId: string): Promise<KnowledgeGraph> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allText = session.loops
            .flatMap((l) => [l.question.text, ...(l.synthesis?.keyFindings || [])])
            .join(' ');

        const entityMap = new Map<string, KnowledgeEntity>();
        const titleWords = allText.split(/\s+/).filter((w) => w.length > 4 && /^[A-Z]/.test(w));

        for (const word of [...new Set(titleWords)].slice(0, 20)) {
            const id = genId('ke');
            entityMap.set(word, {
                id,
                name: word,
                type: 'concept',
                aliases: [word.toLowerCase()],
                mentions: titleWords.filter((w) => w === word).length,
                confidence: 0.7,
            });
        }

        const entities = Array.from(entityMap.values());
        const relations: KnowledgeRelation[] = [];
        const eArr = Array.from(entityMap.keys());
        for (let i = 0; i < eArr.length && i < 10; i++) {
            for (let j = i + 1; j < eArr.length && j < 10; j++) {
                const entI = entityMap.get(eArr[i])!;
                const entJ = entityMap.get(eArr[j])!;
                relations.push({
                    id: genId('kr'),
                    source: entI.id,
                    target: entJ.id,
                    type: 'related_to',
                    weight: 0.5,
                    evidence: [],
                });
            }
        }

        const clusters: KnowledgeCluster[] = [
            {
                id: genId('kc'),
                label: 'Core Concepts',
                entityIds: entities.slice(0, Math.min(5, entities.length)).map((e) => e.id),
                centralConcept: entities[0]?.name || 'Unknown',
                cohesion: 0.6,
            },
        ];

        const knowledgeGraph: KnowledgeGraph = {
            entities,
            relations,
            density:
                entities.length > 0
                    ? relations.length / (entities.length * (entities.length - 1))
                    : 0,
            clusters,
        };

        this.knowledgeGraphs.set(sessionId, knowledgeGraph);
        return knowledgeGraph;
    }

    getKnowledgeGraph(sessionId: string): KnowledgeGraph | undefined {
        return this.knowledgeGraphs.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 4: Systematic Review (PRISMA)
    // ═══════════════════════════════════════════════════════════

    async runSystematicReview(
        sessionId: string,
        config: SystematicReviewConfig,
    ): Promise<SystematicReview> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allSources = session.loops.flatMap((l) => l.sources);
        const total = allSources.length;

        const excludedSources: { source: ResearchSource; reason: string }[] = [];
        const includedSources: ResearchSource[] = [];
        const exclusionReasons: Record<string, number> = {};

        for (const source of allSources) {
            let excluded = false;
            for (const crit of config.exclusionCriteria) {
                const fieldVal = (source as unknown as Record<string, unknown>)[crit.field];
                if (typeof fieldVal === 'string') {
                    const matches =
                        crit.operator === 'contains'
                            ? fieldVal.toLowerCase().includes(crit.value.toLowerCase())
                            : crit.operator === 'equals'
                              ? fieldVal === crit.value
                              : false;
                    if (matches) {
                        exclusionReasons[crit.value] = (exclusionReasons[crit.value] || 0) + 1;
                        excludedSources.push({
                            source,
                            reason: `${crit.field} ${crit.operator} ${crit.value}`,
                        });
                        excluded = true;
                        break;
                    }
                }
            }
            if (!excluded) {
                let included = true;
                if (config.inclusionCriteria.length > 0) {
                    included = false;
                    for (const crit of config.inclusionCriteria) {
                        const fieldVal = source[crit.field as keyof ResearchSource] as
                            string | undefined;
                        if (typeof fieldVal === 'string') {
                            const matches =
                                crit.operator === 'contains'
                                    ? fieldVal.toLowerCase().includes(crit.value.toLowerCase())
                                    : crit.operator === 'equals'
                                      ? fieldVal === crit.value
                                      : false;
                            if (matches) {
                                included = true;
                                break;
                            }
                        }
                    }
                }
                if (included) includedSources.push(source);
                else {
                    excludedSources.push({ source, reason: 'Failed inclusion criteria' });
                    exclusionReasons['Failed inclusion criteria'] =
                        (exclusionReasons['Failed inclusion criteria'] || 0) + 1;
                }
            }
        }

        const prismaFlow: PrismaFlow = {
            identification: total,
            afterDedup: total,
            screened: total,
            excludedAtScreening: Object.entries(exclusionReasons).map(([reason, count]) => ({
                reason,
                count,
            })),
            fullTextAssessed: includedSources.length,
            excludedAtFullText: [],
            included: includedSources.length,
        };

        const biasAssessment: BiasAssessment = {
            selectionBias:
                includedSources.length < total * 0.3
                    ? 'high'
                    : includedSources.length < total * 0.6
                      ? 'medium'
                      : 'low',
            informationBias: 'medium',
            publicationBias: 'low',
            overall: 'medium',
            notes: [`Reviewed ${total} sources, included ${includedSources.length}`],
        };

        const review: SystematicReview = {
            id: genId('sr'),
            sessionId,
            query: session.initialQuestion,
            prismaFlow,
            includedSources,
            excludedSources,
            config,
            biasAssessment,
            createdAt: Date.now(),
        };

        this.systematicReviews.set(sessionId, review);
        return review;
    }

    getSystematicReview(sessionId: string): SystematicReview | undefined {
        return this.systematicReviews.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 5: Fact-Checking
    // ═══════════════════════════════════════════════════════════

    async runFactCheck(sessionId: string): Promise<FactCheckReport> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allClaims = session.loops.flatMap((l) => l.claims);
        const allSources = session.loops.flatMap((l) => l.sources);
        const sourceMap = new Map(allSources.map((s) => [s.id, s]));

        const checks: FactCheckResult[] = allClaims.slice(0, 30).map((claim) => {
            const contradictingIds = claim.contradictions;
            const contradictingSources = contradictingIds
                .map((cid) => {
                    const c = allClaims.find((cl) => cl.id === cid);
                    return c ? sourceMap.get(c.sourceId) : undefined;
                })
                .filter((s): s is ResearchSource => !!s);

            const supportingSources =
                claim.confidence > 0.6
                    ? [sourceMap.get(claim.sourceId)].filter((s): s is ResearchSource => !!s)
                    : [];

            let status: FactCheckResult['status'];
            if (contradictingSources.length > 0 && supportingSources.length === 0) {
                status = 'contradicted';
            } else if (contradictingSources.length > 0 && supportingSources.length > 0) {
                status = 'partially_supported';
            } else if (claim.confidence > 0.5) {
                status = 'supported';
            } else {
                status = 'unverifiable';
            }

            return {
                id: genId('fc'),
                claim: claim.text,
                status,
                supportingSources,
                contradictingSources,
                confidence: claim.confidence,
                explanation: `${status}: ${claim.text.slice(0, 60)}...`,
                timestamp: Date.now(),
            };
        });

        const report: FactCheckReport = {
            sessionId,
            checks,
            overallAccuracy:
                checks.filter((c) => c.status === 'supported' || c.status === 'partially_supported')
                    .length / Math.max(1, checks.length),
            verifiedCount: checks.filter((c) => c.status === 'supported').length,
            contradictedCount: checks.filter((c) => c.status === 'contradicted').length,
            unverifiableCount: checks.filter((c) => c.status === 'unverifiable').length,
            createdAt: Date.now(),
        };

        this.factCheckReports.set(sessionId, report);
        return report;
    }

    getFactCheckReport(sessionId: string): FactCheckReport | undefined {
        return this.factCheckReports.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 7: Anomaly Detection
    // ═══════════════════════════════════════════════════════════

    async detectAnomalies(sessionId: string): Promise<AnomalyReport> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const anomalies: ResearchAnomaly[] = [];
        const allClaims = session.loops.flatMap((l) => l.claims);

        for (const claim of allClaims) {
            if (claim.contradictions.length > 0) {
                anomalies.push({
                    id: genId('an'),
                    type: 'contradiction',
                    severity: 'warning',
                    description: `Claim contradicts ${claim.contradictions.length} other claims`,
                    sources: [claim.sourceId],
                    affectedClaims: [claim.id, ...claim.contradictions],
                    recommendation: 'Cross-reference sources to resolve contradiction',
                    timestamp: Date.now(),
                });
            }
        }

        for (const loop of session.loops) {
            const oldSources = loop.sources.filter(
                (s) => s.timestamp < Date.now() - 365 * 24 * 60 * 60 * 1000,
            );
            if (oldSources.length > 2) {
                anomalies.push({
                    id: genId('an'),
                    type: 'outdated_info',
                    severity: 'info',
                    description: `${oldSources.length} sources are over 1 year old`,
                    sources: oldSources.map((s) => s.id),
                    affectedClaims: allClaims
                        .filter((c) => oldSources.some((s) => s.id === c.sourceId))
                        .map((c) => c.id),
                    recommendation: 'Search for more recent sources',
                    timestamp: Date.now(),
                });
            }
        }

        if (allClaims.length < 3) {
            anomalies.push({
                id: genId('an'),
                type: 'data_gap',
                severity: 'warning',
                description: 'Very few claims extracted — insufficient data for analysis',
                sources: [],
                affectedClaims: [],
                recommendation: 'Run more epistemic loops to gather data',
                timestamp: Date.now(),
            });
        }

        const report: AnomalyReport = {
            sessionId,
            anomalies,
            criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
            warningCount: anomalies.filter((a) => a.severity === 'warning').length,
            infoCount: anomalies.filter((a) => a.severity === 'info').length,
            createdAt: Date.now(),
        };

        this.anomalyReports.set(sessionId, report);
        return report;
    }

    getAnomalyReport(sessionId: string): AnomalyReport | undefined {
        return this.anomalyReports.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 8: Summarization
    // ═══════════════════════════════════════════════════════════

    async generateSummary(
        sessionId: string,
        style: SummaryStyle,
        length: SummaryLength,
    ): Promise<SummarizationResult> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allText = session.loops
            .flatMap((l) => [
                l.question.text,
                ...l.sources.map((s) => s.snippet),
                ...(l.synthesis?.keyFindings || []),
                l.synthesis?.summary || '',
            ])
            .filter(Boolean);

        const wordLimit = length === 'brief' ? 100 : length === 'normal' ? 300 : 800;
        const sentences = allText
            .join(' ')
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 20);

        const scored = sentences.map((s) => ({
            sentence: s.trim(),
            score: allText.filter((t) => t.toLowerCase().includes(s.toLowerCase().slice(0, 20)))
                .length,
        }));
        scored.sort((a, b) => b.score - a.score);

        const selected = scored.slice(0, Math.ceil(wordLimit / 30));
        const summary = selected.map((s) => s.sentence + '.').join(' ');

        const totalWords = allText.join(' ').split(/\s+/).length;
        const summaryWords = summary.split(/\s+/).length;

        const result: SummarizationResult = {
            id: genId('sum'),
            sessionId,
            style,
            length,
            summary: summary || 'Insufficient data for summary.',
            sourceCount: session.loops.reduce((s, l) => s + l.sources.length, 0),
            compressionRatio: totalWords > 0 ? summaryWords / totalWords : 0,
            keyPoints: selected.slice(0, 5).map((s) => s.sentence),
            createdAt: Date.now(),
        };

        const existing = this.summarizations.get(sessionId) || [];
        existing.push(result);
        this.summarizations.set(sessionId, existing);
        return result;
    }

    getSummaries(sessionId: string): SummarizationResult[] {
        return this.summarizations.get(sessionId) || [];
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 10: Citation Generation
    // ═══════════════════════════════════════════════════════════

    async generateCitations(sessionId: string, format: CitationFormat): Promise<CitationExport> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allSources = [
            ...new Map(session.loops.flatMap((l) => l.sources).map((s) => [s.id, s])).values(),
        ];

        const entries: CitationEntry[] = allSources.map((source) => {
            const title = source.title || 'Unknown Title';
            const cleanTitle = title.replace(/[^\w\s]/g, '');
            const key = cleanTitle.split(/\s+/).slice(0, 3).join('_').toLowerCase() || 'ref';
            const year = source.year ?? new Date(source.timestamp).getFullYear();

            return {
                id: source.id,
                source,
                bibtex: `@misc{${key}_${year},\n  title = {{${title}}},\n  url = {${source.url}},\n  year = {${year}},\n  note = {[${source.sourceType}]}\n}`,
                apa: `${title}. (${year}). Retrieved from ${source.url}`,
                mla: `"${title}." ${source.url}. Accessed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
                chicago: `${title}. ${source.url} (accessed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).`,
            };
        });

        const allContent = entries.map((e) => e[format]).join('\n---\n');

        const export_: CitationExport = { entries, format, content: allContent };
        this.citationExports.set(sessionId, export_);
        return export_;
    }

    getCitationExport(sessionId: string): CitationExport | undefined {
        return this.citationExports.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 11: Peer Review
    // ═══════════════════════════════════════════════════════════

    async runPeerReview(sessionId: string): Promise<PeerReview> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const reviewers = [
            { id: genId('prv'), name: 'Dr. Methodology', expertise: 'Research Methodology' },
            { id: genId('prv'), name: 'Prof. Domain', expertise: 'Domain Expertise' },
            { id: genId('prv'), name: 'Dr. Statistics', expertise: 'Statistical Analysis' },
        ];

        const comments: PeerReviewComment[] = [];
        const allKeyFindings = session.loops.flatMap((l) => l.synthesis?.keyFindings || []);
        const allGaps = session.loops.flatMap((l) => l.synthesis?.gaps || []);

        for (const reviewer of reviewers) {
            if (allKeyFindings.length > 0) {
                comments.push({
                    id: genId('prc'),
                    reviewerId: reviewer.id,
                    section: 'Key Findings',
                    comment: `The findings section presents ${allKeyFindings.length} key points. Consider strengthening with quantitative evidence.`,
                    type: 'suggestion',
                    severity: 'minor',
                });
            }
            if (allGaps.length > 0) {
                comments.push({
                    id: genId('prc'),
                    reviewerId: reviewer.id,
                    section: 'Limitations',
                    comment: `The identified gaps (${allGaps.join('; ')}) are noted but lack proposed mitigation strategies.`,
                    type: 'major_issue',
                    severity: 'major',
                });
            }
            comments.push({
                id: genId('prc'),
                reviewerId: reviewer.id,
                section: 'Methodology',
                comment: `Research approach uses epistemic loop methodology with ${session.loops.length} iterations. ${
                    session.loops.length < 3
                        ? 'Consider additional iterations for robustness.'
                        : 'Iteration count is adequate.'
                }`,
                type: session.loops.length < 3 ? 'major_issue' : 'praise',
                severity: session.loops.length < 3 ? 'major' : 'cosmetic',
            });
        }

        const avgConfidence =
            session.loops.length > 0
                ? session.loops.reduce((s, l) => s + (l.synthesis?.confidence || 0), 0) /
                  session.loops.length
                : 0;

        const overallScore = avgConfidence * 100;
        const scores = {
            originality: Math.min(100, Math.round(overallScore + 10)),
            methodology: Math.min(100, Math.round(overallScore + session.loops.length * 5)),
            clarity: Math.min(100, Math.round(overallScore + 15)),
            significance: Math.min(100, Math.round(overallScore + 5)),
            overall: Math.min(100, Math.round(overallScore)),
        };

        const avgScore =
            (scores.originality + scores.methodology + scores.clarity + scores.significance) / 4;
        let recommendation: PeerReview['recommendation'];
        if (avgScore >= 75) recommendation = 'accept';
        else if (avgScore >= 60) recommendation = 'minor_revision';
        else if (avgScore >= 40) recommendation = 'major_revision';
        else recommendation = 'reject';

        const review: PeerReview = {
            id: genId('pr'),
            reportId: sessionId,
            reportTitle: session.title,
            reviewers,
            comments,
            scores,
            recommendation,
            summary: `Peer review completed by ${reviewers.length} reviewers. Overall score: ${scores.overall}/100. Recommendation: ${recommendation}.`,
            createdAt: Date.now(),
        };

        this.peerReviews.set(sessionId, review);
        return review;
    }

    getPeerReview(sessionId: string): PeerReview | undefined {
        return this.peerReviews.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Phase 12: Auto-Discovery
    // ═══════════════════════════════════════════════════════════

    async runDiscovery(): Promise<DiscoveryResult> {
        const allLoops = Array.from(this.sessions.values()).flatMap((s) => s.loops);
        const allText = allLoops
            .flatMap((l) => [l.question.text, ...(l.synthesis?.keyFindings || [])])
            .join(' ');

        const wordFreq = new Map<string, number>();
        const words = allText.split(/\s+/).filter((w) => w.length > 5 && /^[A-Za-z]/.test(w));
        for (const w of words) {
            wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
        }

        const sorted = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);

        const topics: DiscoveryTopic[] = sorted.slice(0, 8).map(([word, freq], i) => ({
            id: genId('dt'),
            name: word,
            description: `Frequently discussed concept: "${word}" appears ${freq} times across research sessions`,
            sourceKeywords: [word.toLowerCase()],
            frequency: freq,
            trend: i < 3 ? 'rising' : i < 5 ? 'stable' : 'emerging',
            relevanceScore: Math.min(1, freq / Math.max(1, sorted[0]?.[1] || 1)),
            relatedTopics: sorted
                .slice(0, 3)
                .map(([w]) => w)
                .filter((w) => w !== word),
            lastObserved: Date.now(),
        }));

        const emergingTopics = topics.filter((t) => t.trend === 'emerging');
        const recommendations = topics.slice(0, 3).map((t) => ({
            topicId: t.id,
            reason: `High-frequency concept "${t.name}" warrants deeper investigation`,
        }));

        const result: DiscoveryResult = {
            topics,
            trends: topics.map((t) => ({
                topic: t.name,
                change:
                    t.trend === 'rising'
                        ? 0.3
                        : t.trend === 'falling'
                          ? -0.2
                          : t.trend === 'emerging'
                            ? 0.5
                            : 0,
            })),
            emergingTopics,
            recommendations,
            analyzedAt: Date.now(),
        };

        this._discoveryResult = result;
        return result;
    }

    getDiscoveryResult(): DiscoveryResult | undefined {
        return this._discoveryResult || undefined;
    }

    // ═══════════════════════════════════════════════════════════
    // Research Report (combines all phases)
    // ═══════════════════════════════════════════════════════════

    async generateResearchReport(sessionId: string, format: ReportFormat): Promise<ResearchReport> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const allSources = session.loops.flatMap((l) => l.sources);
        const allClaims = session.loops.flatMap((l) => l.claims);
        const summaryResult = await this.generateSummary(sessionId, 'hybrid', 'detailed');
        let peerReview = this.peerReviews.get(sessionId);
        if (!peerReview) peerReview = await this.runPeerReview(sessionId);

        const citations = await this.generateCitations(sessionId, 'bibtex');
        await this.buildCitationGraph(sessionId);
        await this.buildKnowledgeGraph(sessionId);

        const sections: ResearchReport['sections'] = [
            {
                id: genId('rsec'),
                title: 'Abstract',
                content: summaryResult.summary.slice(0, 500),
                wordCount: summaryResult.summary.split(/\s+/).length,
            },
            {
                id: genId('rsec'),
                title: 'Methodology',
                content: `Epistemic loop methodology with ${session.loops.length} iterations. Sources: ${allSources.length} documents across ${new Set(allSources.map((s) => s.category)).size} categories.`,
                wordCount: 50,
            },
            {
                id: genId('rsec'),
                title: 'Key Findings',
                content: summaryResult.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n\n'),
                wordCount: summaryResult.keyPoints.length * 15,
            },
            {
                id: genId('rsec'),
                title: 'Analysis',
                content: `Analyzed ${allClaims.length} claims from ${allSources.length} sources. Fact-check accuracy: ${(this.factCheckReports.get(sessionId)?.overallAccuracy || 0) * 100}%. ${allClaims.filter((c) => c.contradictions.length > 0).length} claims have contradictions.`,
                wordCount: 60,
            },
            {
                id: genId('rsec'),
                title: 'Limitations',
                content: `Source limitations: ${allSources.length} sources analyzed. ${
                    session.loops.flatMap((l) => l.synthesis?.gaps || []).join('; ') ||
                    'No specific gaps identified.'
                }`,
                wordCount: 40,
            },
            {
                id: genId('rsec'),
                title: 'Conclusions',
                content: `Research on "${session.title}" completed with ${session.loops.length} epistemic loops. Peer review score: ${peerReview.scores.overall}/100. Recommendation: ${peerReview.recommendation}.`,
                wordCount: 35,
            },
            {
                id: genId('rsec'),
                title: 'References',
                content: citations.entries.map((e) => e.bibtex).join('\n\n'),
                wordCount: citations.entries.length * 5,
            },
        ];

        const report: ResearchReport = {
            id: genId('rr'),
            sessionId,
            title: session.title,
            format,
            status: 'ready',
            sections,
            sources: new Set(allSources.map((s) => s.id)).size,
            tokens: allText(session).split(/\s+/).length,
            citations: citations.entries,
            peerReview,
            createdAt: Date.now(),
            completedAt: Date.now(),
        };

        this.researchReports.set(sessionId, report);
        return report;
    }

    getResearchReport(sessionId: string): ResearchReport | undefined {
        return this.researchReports.get(sessionId);
    }

    // ═══════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════

    private getNextQuestion(session: ResearchSession): string {
        if (session.loops.length === 0) return session.initialQuestion;
        const last = session.loops[session.loops.length - 1];
        if (last.synthesis?.newQuestions.length) {
            return last.synthesis.newQuestions[0];
        }
        return `${session.initialQuestion} (deeper analysis, iteration ${session.loops.length + 1})`;
    }

    private async searchSources(query: string): Promise<ResearchSource[]> {
        const sources: ResearchSource[] = [];

        try {
            const results = await sourceAdapterRegistry.searchAll(query);

            for (const [, adapterSources] of results) {
                sources.push(...adapterSources);
            }
        } catch {
            LOGGER.warn('ResearchEngine', 'Search failed', { query });
        }

        // Fallback: if no sources found, try restricted adapters (they return guidance messages)
        if (sources.length === 0) {
            const restricted = sourceAdapterRegistry.getAllAdapters().filter((a) => a.isRestricted);
            for (const adapter of restricted) {
                try {
                    const r = await adapter.search(query, sourceAdapterRegistry.getConfig());
                    sources.push(...r);
                } catch {
                    // skip
                }
            }
        }

        return sources.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
    }

    private extractClaims(sources: ResearchSource[], _question: string): ResearchClaim[] {
        const claims: ResearchClaim[] = [];
        for (const source of sources) {
            if (!source.snippet) continue;
            const sentences = source.snippet.split(/[.!?]+/).filter((s) => s.trim().length > 20);
            for (const sentence of sentences.slice(0, 3)) {
                claims.push({
                    id: genId('cl'),
                    text: sentence.trim(),
                    sourceId: source.id,
                    confidence: source.relevanceScore * (sentence.length > 50 ? 0.8 : 0.5),
                    contradictions: [],
                    timestamp: Date.now(),
                });
            }
        }
        this.detectContradictions(claims);
        return claims;
    }

    /** EXPERIMENTAL: Detects potential contradictions via high lexical overlap
     *  (Jaccard > 0.6, < 0.95). This is a heuristic — real contradiction detection
     *  requires semantic analysis. Results are directional hints, not verified claims. */
    private detectContradictions(claims: ResearchClaim[]): void {
        for (let i = 0; i < claims.length; i++) {
            for (let j = i + 1; j < claims.length; j++) {
                const wordsA = new Set(claims[i].text.toLowerCase().split(/\s+/));
                const wordsB = new Set(claims[j].text.toLowerCase().split(/\s+/));
                const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
                const total = new Set([...wordsA, ...wordsB]).size;
                const jaccard = total > 0 ? overlap / total : 0;
                if (jaccard > 0.6 && jaccard < 0.95) {
                    claims[i].contradictions.push(claims[j].id);
                    claims[j].contradictions.push(claims[i].id);
                }
            }
        }
    }

    private synthesize(claims: ResearchClaim[], question: string): ResearchSynthesis {
        const keyFindings = claims
            .filter((c) => c.confidence > 0.4 && c.contradictions.length === 0)
            .map((c) => c.text)
            .slice(0, 5);

        const contradictory = claims.filter((c) => c.contradictions.length > 0);
        const gaps =
            contradictory.length > 0
                ? [`${contradictory.length} contradictory claims need resolution`]
                : [];

        if (claims.length === 0) gaps.push('No sources found — try a different query');

        const newQuestions =
            keyFindings.length > 0
                ? [
                      `What are the implications of: ${keyFindings[0].slice(0, 80)}?`,
                      `How does ${question} compare with alternative approaches?`,
                      `What evidence contradicts the finding that ${keyFindings[0]?.slice(0, 60) || question}?`,
                  ]
                : [`Refine search for: ${question}`];

        return {
            summary:
                keyFindings.length > 0
                    ? `Found ${keyFindings.length} key findings from ${claims.length} claims across ${new Set(claims.map((c) => c.sourceId)).size} sources.`
                    : 'No significant findings in this iteration.',
            keyFindings,
            confidence:
                claims.length > 0
                    ? claims.reduce((s, c) => s + c.confidence, 0) / claims.length
                    : 0,
            gaps,
            newQuestions: newQuestions.slice(0, 3),
            timestamp: Date.now(),
        };
    }

    private trimSessions(): void {
        if (this.sessions.size > MAX_SESSIONS) {
            const sorted = Array.from(this.sessions.entries()).sort(
                ([, a], [, b]) => a.createdAt - b.createdAt,
            );
            const toDelete = sorted.slice(0, this.sessions.size - MAX_SESSIONS);
            for (const [id] of toDelete) this.sessions.delete(id);
        }
    }
}

function allText(session: ResearchSession): string {
    return session.loops
        .flatMap((l) => [
            l.question.text,
            ...l.sources.map((s) => s.snippet),
            l.synthesis?.summary || '',
        ])
        .join(' ');
}
