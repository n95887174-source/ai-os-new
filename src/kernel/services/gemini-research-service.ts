import { rootLogger } from './logger-service';
import type {
    IGeminiResearchService,
    GeminiEnhancedSearchResult,
    GeminiResearchSource,
    GeminiClaimAnalysis,
    GeminiEnhancedSummary,
    GeminiPeerReviewOutput,
    GeminiAnomalyResult,
} from '../contracts/gemini-research';
import type { GoogleGenAIService } from './google-genai-service';
import type { ResearchEngineService } from './research-engine-service';
import type { ChatMessage } from '../types/llm-types';
import type { ResearchSession } from '../contracts/research-engine';

const LOGGER = rootLogger.child('GeminiResearch');

function buildMessages(system: string, user: string): ChatMessage[] {
    return [
        { role: 'system', content: system },
        { role: 'user', content: user },
    ];
}

function extractJson(text: string): unknown {
    const cleaned = text
        .replace(/```(?:json)?\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart === -1 || objEnd === -1 || objEnd <= objStart) return null;
    const candidate = cleaned.slice(objStart, objEnd + 1);
    try {
        return JSON.parse(candidate);
    } catch (e) {
        LOGGER.warn('GeminiResearch', 'extractJson failed', {
            error: e instanceof Error ? e.message : String(e),
            preview: candidate.slice(0, 200),
        });
        return null;
    }
}

const SEARCH_PROMPT = `You are a research assistant. Answer the question thoroughly using your knowledge. For each factual claim, provide a source reference. Return your answer as JSON:
{
  "answer": "detailed answer",
  "sources": [{"title": "source name", "uri": "url or reference", "snippet": "relevant excerpt", "relevanceScore": 0.0-1.0}],
  "confidence": 0.0-1.0
}`;

const CLAIM_ANALYSIS_PROMPT = `You are a fact-checking analyst. Evaluate each claim against available evidence. Return JSON:
{
  "analyses": [{"claimId": "...", "claim": "...", "assessment": "supported|contradicted|unverifiable|partially_supported", "confidence": 0.0-1.0, "reasoning": "...", "suggestedCorrection": "..."}]
}`;

const SUMMARY_PROMPT = `You are a research summarizer. Analyze the research session data and produce a structured summary. Return JSON:
{
  "abstract": "comprehensive abstract",
  "keyFindings": ["finding 1", "finding 2"],
  "methodology": "methodology description",
  "limitations": ["limitation 1"],
  "futureWork": ["future direction 1"]
}`;

const PEER_REVIEW_PROMPT = `You are a peer reviewer. Evaluate the research thoroughly. Return JSON:
{
  "originality": 0-100,
  "methodology": 0-100,
  "clarity": 0-100,
  "significance": 0-100,
  "overall": 0-100,
  "recommendation": "accept|minor_revision|major_revision|reject",
  "summary": "brief summary of review",
  "comments": [{"section": "...", "type": "major_issue|minor_issue|question|suggestion|praise", "severity": "critical|major|minor|cosmetic", "comment": "..."}]
}`;

const ANOMALY_PROMPT = `You are a research integrity analyst. Examine the session for contradictions, gaps, biases, and flaws. Return JSON:
{
  "anomalies": [{"type": "contradiction|data_gap|methodology_flaw|source_bias", "severity": "critical|warning|info", "description": "...", "affectedClaims": ["..."], "recommendation": "..."}]
}`;

export class GeminiAugmentedResearchService implements IGeminiResearchService {
    private _initialized = false;
    private _model = 'gemini-2.5-flash';

    constructor(
        private deps: {
            googleGenAI: GoogleGenAIService;
            researchEngine: ResearchEngineService;
        },
    ) {}

    get isAvailable(): boolean {
        return this.deps.googleGenAI.isConfigured;
    }

    async init(): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;
        LOGGER.info('GeminiResearch', 'Gemini Research augmentation initialized');
    }

    async start(): Promise<void> {
        LOGGER.info('GeminiResearch', 'Gemini Research augmentation started');
    }

    async destroy(): Promise<void> {
        this._initialized = false;
    }

    async enhancedSearch(query: string): Promise<GeminiEnhancedSearchResult> {
        const start = Date.now();
        try {
            const resp = await this.deps.googleGenAI.generateContent(
                buildMessages(SEARCH_PROMPT, query),
                this._model,
                { temperature: 0.3, googleSearchGrounding: true },
            );
            const parsed = extractJson(resp.content) as Record<string, unknown> | null;
            if (parsed && typeof parsed.answer === 'string') {
                const rawSources = parsed.sources;
                const sources: GeminiResearchSource[] = Array.isArray(rawSources)
                    ? rawSources.map((s: Record<string, unknown>) => ({
                          title: String(s.title || 'Source'),
                          uri: String(s.uri || ''),
                          snippet: String(s.snippet || '').slice(0, 300),
                          relevanceScore: Number(s.relevanceScore) || 0.5,
                      }))
                    : [];
                return {
                    query,
                    answer: parsed.answer as string,
                    sources,
                    confidence: Number(parsed.confidence) || 0.5,
                    latency: Date.now() - start,
                };
            }
            return {
                query,
                answer: resp.content || 'No answer generated',
                sources: [],
                confidence: 0.3,
                latency: Date.now() - start,
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            LOGGER.error('GeminiResearch', 'enhancedSearch failed', { query, error: msg });
            return {
                query,
                answer: `Search failed: ${msg}`,
                sources: [],
                confidence: 0,
                latency: Date.now() - start,
            };
        }
    }

    async analyzeClaims(sessionId: string): Promise<GeminiClaimAnalysis[]> {
        const session = this.deps.researchEngine.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);
        try {
            const allClaims = session.loops.flatMap((l) => l.claims);
            if (allClaims.length === 0) return [];
            const batchSize = 10;
            const results: GeminiClaimAnalysis[] = [];
            for (let i = 0; i < allClaims.length; i += batchSize) {
                const batch = allClaims.slice(i, i + batchSize);
                const context = batch
                    .map((c) => `[${c.id}] ${c.text} (confidence: ${c.confidence})`)
                    .join('\n');
                const resp = await this.deps.googleGenAI.generateContent(
                    buildMessages(CLAIM_ANALYSIS_PROMPT, `Analyze these claims:\n${context}`),
                    this._model,
                    { temperature: 0.2 },
                );
                const parsed = extractJson(resp.content) as Record<string, unknown> | null;
                if (parsed && Array.isArray(parsed.analyses)) {
                    for (const a of parsed.analyses as Array<Record<string, unknown>>) {
                        results.push({
                            claimId: String(a.claimId || ''),
                            claim: String(a.claim || ''),
                            assessment:
                                (a.assessment as GeminiClaimAnalysis['assessment']) ||
                                'unverifiable',
                            confidence: Number(a.confidence) || 0,
                            reasoning: String(a.reasoning || ''),
                            suggestedCorrection: a.suggestedCorrection
                                ? String(a.suggestedCorrection)
                                : undefined,
                        });
                    }
                }
            }
            return results;
        } catch (e) {
            LOGGER.error('GeminiResearch', 'analyzeClaims failed', { sessionId, error: String(e) });
            return [];
        }
    }

    async generateEnhancedSummary(sessionId: string): Promise<GeminiEnhancedSummary> {
        const session = this.deps.researchEngine.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);
        try {
            const context = this.buildSessionContext(session);
            const resp = await this.deps.googleGenAI.generateContent(
                buildMessages(
                    SUMMARY_PROMPT,
                    `Research session: "${session.title}"\nQuestion: ${session.initialQuestion}\n\nData:\n${context}`,
                ),
                this._model,
                { temperature: 0.3 },
            );
            const parsed = extractJson(resp.content) as Record<string, unknown> | null;
            if (parsed) {
                return {
                    sessionId,
                    title: session.title,
                    abstract: String(parsed.abstract || ''),
                    keyFindings: Array.isArray(parsed.keyFindings)
                        ? parsed.keyFindings.map(String)
                        : [],
                    methodology: String(parsed.methodology || ''),
                    limitations: Array.isArray(parsed.limitations)
                        ? parsed.limitations.map(String)
                        : [],
                    futureWork: Array.isArray(parsed.futureWork)
                        ? parsed.futureWork.map(String)
                        : [],
                };
            }
            return {
                sessionId,
                title: session.title,
                abstract: resp.content.slice(0, 500),
                keyFindings: [],
                methodology: '',
                limitations: [],
                futureWork: [],
            };
        } catch (e) {
            LOGGER.error('GeminiResearch', 'generateEnhancedSummary failed', {
                sessionId,
                error: String(e),
            });
            return {
                sessionId,
                title: 'Summary failed',
                abstract: '',
                keyFindings: [],
                methodology: '',
                limitations: [],
                futureWork: [],
            };
        }
    }

    async detectAnomalies(sessionId: string): Promise<GeminiAnomalyResult> {
        const session = this.deps.researchEngine.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);
        try {
            const context = this.buildSessionContext(session);
            const resp = await this.deps.googleGenAI.generateContent(
                buildMessages(ANOMALY_PROMPT, `Examine this research for anomalies:\n${context}`),
                this._model,
                { temperature: 0.2 },
            );
            const parsed = extractJson(resp.content) as Record<string, unknown> | null;
            if (parsed && Array.isArray(parsed.anomalies)) {
                return {
                    anomalies: parsed.anomalies.map((a: Record<string, unknown>) => ({
                        type: a.type as GeminiAnomalyResult['anomalies'][0]['type'],
                        severity: a.severity as GeminiAnomalyResult['anomalies'][0]['severity'],
                        description: String(a.description || ''),
                        affectedClaims: Array.isArray(a.affectedClaims)
                            ? a.affectedClaims.map(String)
                            : [],
                        recommendation: String(a.recommendation || ''),
                    })),
                };
            }
            return { anomalies: [] };
        } catch (e) {
            LOGGER.error('GeminiResearch', 'detectAnomalies failed', {
                sessionId,
                error: String(e),
            });
            return { anomalies: [] };
        }
    }

    async runEnhancedPeerReview(sessionId: string): Promise<GeminiPeerReviewOutput> {
        const session = this.deps.researchEngine.getSession(sessionId);
        if (!session) throw new Error(`Session ${sessionId} not found`);
        try {
            const context = this.buildSessionContext(session);
            const resp = await this.deps.googleGenAI.generateContent(
                buildMessages(
                    PEER_REVIEW_PROMPT,
                    `Peer review this research:\nTitle: ${session.title}\nQuestion: ${session.initialQuestion}\n\nData:\n${context}`,
                ),
                this._model,
                { temperature: 0.2 },
            );
            const parsed = extractJson(resp.content) as Record<string, unknown> | null;
            if (parsed) {
                const scores = {
                    originality: Math.min(100, Math.max(0, Number(parsed.originality) || 50)),
                    methodology: Math.min(100, Math.max(0, Number(parsed.methodology) || 50)),
                    clarity: Math.min(100, Math.max(0, Number(parsed.clarity) || 50)),
                    significance: Math.min(100, Math.max(0, Number(parsed.significance) || 50)),
                    overall: Math.min(100, Math.max(0, Number(parsed.overall) || 50)),
                };
                return {
                    ...scores,
                    recommendation:
                        (parsed.recommendation as GeminiPeerReviewOutput['recommendation']) ||
                        'major_revision',
                    summary: String(parsed.summary || ''),
                    comments: Array.isArray(parsed.comments)
                        ? parsed.comments.map((c: Record<string, unknown>) => ({
                              section: String(c.section || 'general'),
                              type: c.type as GeminiPeerReviewOutput['comments'][0]['type'],
                              severity:
                                  c.severity as GeminiPeerReviewOutput['comments'][0]['severity'],
                              comment: String(c.comment || ''),
                          }))
                        : [],
                };
            }
            return {
                originality: 0,
                methodology: 0,
                clarity: 0,
                significance: 0,
                overall: 0,
                recommendation: 'major_revision',
                summary: 'Peer review could not be completed.',
                comments: [],
            };
        } catch (e) {
            LOGGER.error('GeminiResearch', 'runEnhancedPeerReview failed', {
                sessionId,
                error: String(e),
            });
            return {
                originality: 0,
                methodology: 0,
                clarity: 0,
                significance: 0,
                overall: 0,
                recommendation: 'major_revision',
                summary: `Peer review failed: ${e instanceof Error ? e.message : String(e)}`,
                comments: [],
            };
        }
    }

    private buildSessionContext(session: ResearchSession): string {
        const parts: string[] = [];
        for (const loop of session.loops) {
            parts.push(`Loop: ${loop.question.text}`);
            parts.push(
                `Sources (${loop.sources.length}): ${loop.sources.map((s) => s.title).join(', ')}`,
            );
            parts.push(
                `Claims (${loop.claims.length}): ${loop.claims.map((c) => c.text.slice(0, 100)).join(' | ')}`,
            );
            if (loop.synthesis) {
                parts.push(`Findings: ${loop.synthesis.keyFindings.join('; ')}`);
                parts.push(`Gaps: ${loop.synthesis.gaps.join('; ')}`);
            }
        }
        return parts.join('\n').slice(0, 8000);
    }
}
