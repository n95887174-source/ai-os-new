// ── Adversarial Belief Mining (P0.6) ──────────────────────────────────
// Extracts implicit beliefs (values, assumptions, epistemic stances) from
// debate arguments, detects cross-agent belief conflicts, and surfaces
// fundamental disagreements that surface-level arguments miss.

export type BeliefType =
    | 'value_judgment'
    | 'causal_assumption'
    | 'epistemic_stance'
    | 'deontic_claim'
    | 'ontological_frame';

export interface MinedBelief {
    readonly agentId: string;
    readonly agentName: string;
    readonly type: BeliefType;
    readonly premise: string;
    readonly confidence: number;
    readonly sourceArgumentId: string;
    readonly round: number;
}

export type ConflictType =
    'value_inversion' | 'epistemic_divergence' | 'ontological_mismatch' | 'causal_contradiction';

export interface BeliefConflict {
    readonly type: ConflictType;
    readonly agentA: string;
    readonly agentB: string;
    readonly beliefA: string;
    readonly beliefB: string;
    readonly severity: number;
    readonly description: string;
    readonly round: number;
}

export const BELIEF_DETECTION_PATTERNS: Record<BeliefType, RegExp[]> = {
    value_judgment: [
        /\b(важно|необходимо|критично|ключевое|первостепенно|приоритет)\b/iu,
        /\b(хорошо|плохо|лучше|хуже|полезно|вредно|опасно|безопасно|этично|неэтично)\b/iu,
        /\b(important|crucial|critical|essential|vital|key|paramount|imperative)\b/i,
        /\b(good|bad|better|worse|useful|harmful|dangerous|safe|ethical|unethical|beneficial|detrimental)\b/i,
        /\b(justice|fairness|rights|freedom|equality|dignity|welfare|autonomy)\b/i,
        /\b(справедливость|свобода|равенство|права|достоинство|автономия)\b/iu,
    ],
    causal_assumption: [
        /\b(потому что|поскольку|так как|вследствие|из-за|приводит к|вызывает|ведёт к|обусловлено)\b/iu,
        /\b(because|since|due to|leads to|causes|results in|driven by|stems from|attributed to)\b/i,
        /\b(если.*то|чем.*тем|без.*не|когда.*тогда)/iu,
        /\b(if.*then|when.*then|the more.*the more|without.*cannot|unless)/i,
    ],
    epistemic_stance: [
        /\b(несомненно|бесспорно|очевидно|доказано|известно|факт|неопровержимо)\b/iu,
        /\b(неизвестно|неясно|спорно|сомнительно|недоказано|гипотетически|возможно|вероятно)\b/iu,
        /\b(undoubtedly|certainly|proven|established|fact|unquestionably|demonstrated|confirmed)\b/i,
        /\b(uncertain|unknown|unclear|disputed|questionable|hypothetical|speculative|allegedly)\b/i,
        /\b(science shows|studies prove|research indicates|evidence suggests|data confirms)\b/i,
        /\b(наука доказывает|исследования показывают|данные подтверждают|эксперты утверждают)\b/iu,
    ],
    deontic_claim: [
        /\b(должны|следует|надо|нужно|обязаны|нельзя|запрещено|разрешено|можно)\b/iu,
        /\b(should|must|ought|have to|need to|required|prohibited|allowed|permitted|forbidden)\b/i,
        /\b(обязанность|ответственность|долг|право|гарантия)\b/iu,
        /\b(obligation|responsibility|duty|right|entitlement|mandate)\b/i,
    ],
    ontological_frame: [
        /\b(это не|это|представляет собой|является|суть|состоит в том)\b/iu,
        /\b(is not|is essentially|constitutes|represents|amounts to|boils down to)\b/i,
        /\b(следует рассматривать|нельзя считать|стоит воспринимать|нужно понимать как)\b/iu,
        /\b(must be viewed|should be seen|should be understood|can be characterized)\b/i,
    ],
};

export interface IBeliefMiningService {
    /**
     * Extract implicit beliefs from all previous debate arguments.
     * Returns all mined beliefs across all agents.
     */
    extractBeliefs(
        previousArguments: ReadonlyArray<{
            id: string;
            agentId: string;
            agentName: string;
            content: string;
            round: number;
        }>,
    ): MinedBelief[];

    /**
     * Detect belief conflicts between agents given all mined beliefs.
     * Returns conflicts sorted by severity descending.
     */
    detectConflicts(beliefs: ReadonlyArray<MinedBelief>, currentRound: number): BeliefConflict[];

    /**
     * Convenience: extract + detect in one call.
     * Returns top-N most severe conflicts suitable for prompt injection.
     */
    mineConflicts(
        previousArguments: ReadonlyArray<{
            id: string;
            agentId: string;
            agentName: string;
            content: string;
            round: number;
        }>,
        currentRound: number,
    ): BeliefConflict[];
}
