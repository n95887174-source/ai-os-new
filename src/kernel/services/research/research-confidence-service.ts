/**
 * Research Confidence Intervals Service
 * Statistical rigor for research findings
 */

import { genId } from '../../../utils/gen-id';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('ResearchCI');

export interface StatisticalResult {
  metric: string;
  value: number;
  confidenceInterval: { lower: number; upper: number };
  confidenceLevel: number; // 0.95 or 0.99
  sampleSize: number;
  standardError: number;
}

export interface HypothesisTest {
  id: string;
  hypothesis: string;
  controlValue: number;
  variantValue: number;
  testType: 't-test' | 'chi-square' | 'mann-whitney';
  statistic: number;
  pValue: number;
  significant: boolean;
  effectSize: number;
}

export interface ConfidenceReport {
  id: string;
  module: string;
  timestamp: number;
  results: StatisticalResult[];
  tests: HypothesisTest[];
  summary: {
    reliableMetrics: string[];
    unreliableMetrics: string[];
    recommendations: string[];
  };
}

class ResearchConfidenceService {
  /**
   * Calculate confidence interval
   */
  calculateCI(
    samples: number[],
    confidenceLevel = 0.95
  ): { mean: number; lower: number; upper: number; standardError: number } {
    if (samples.length === 0) {
      return { mean: 0, lower: 0, upper: 0, standardError: 0 };
    }

    const n = samples.length;
    // B10-57: Guard against empty or single-element arrays
    if (n === 0) return { mean: 0, lower: 0, upper: 0, standardError: 0 };
    if (n === 1) return { mean: samples[0], lower: samples[0], upper: samples[0], standardError: 0 };
    const mean = samples.reduce((a, b) => a + b, 0) / n;
    
    // Standard deviation
    const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const standardError = stdDev / Math.sqrt(n);

    // Z-scores for confidence levels
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };

    const z = zScores[confidenceLevel] || 1.96;
    const margin = z * standardError;

    return {
      mean,
      lower: mean - margin,
      upper: mean + margin,
      standardError,
    };
  }

  /**
   * Run t-test between two groups
   */
  tTest(groupA: number[], groupB: number[]): {
    tStatistic: number;
    degreesOfFreedom: number;
    pValue: number;
    significant: boolean;
    effectSize: number; // Cohen's d
  } {
    const n1 = groupA.length;
    const n2 = groupB.length;
    
    // B10-54: Guard against empty or single-element groups
    if (n1 < 2 || n2 < 2) {
      return { tStatistic: 0, degreesOfFreedom: 0, pValue: 1, significant: false, effectSize: 0 };
    }

    const mean1 = groupA.reduce((a, b) => a + b, 0) / n1;
    const mean2 = groupB.reduce((a, b) => a + b, 0) / n2;

    const var1 = groupA.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
    const var2 = groupB.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);

    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const tStatistic = (mean1 - mean2) / se;

    // Welch-Satterthwaite degrees of freedom
    const df = Math.pow(var1 / n1 + var2 / n2, 2) / 
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

    // Approximate p-value using t-distribution lookup
    const pValue = this.tDistPValue(Math.abs(tStatistic), df);

    // Cohen's d effect size
    const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
    const effectSize = Math.abs(mean1 - mean2) / pooledStd;

    return {
      tStatistic,
      degreesOfFreedom: df,
      pValue,
      significant: pValue < 0.05,
      effectSize,
    };
  }

  /**
   * Run chi-square test
   */
  chiSquareTest(observed: number[], expected: number[]): {
    chiSquare: number;
    degreesOfFreedom: number;
    pValue: number;
    significant: boolean;
  } {
    if (observed.length !== expected.length) {
      throw new Error('Arrays must have same length');
    }

    let chiSquare = 0;
    for (let i = 0; i < observed.length; i++) {
      const diff = observed[i] - expected[i];
      chiSquare += (diff * diff) / expected[i];
    }

    const df = observed.length - 1;
    const pValue = this.chiSquarePValue(chiSquare, df);

    return {
      chiSquare,
      degreesOfFreedom: df,
      pValue,
      significant: pValue < 0.05,
    };
  }

  /**
   * Calculate required sample size
   */
  calculateSampleSize(
    effectSize: number,
    alpha = 0.05,
    power = 0.8
  ): number {
    const zAlpha = 1.96; // for alpha = 0.05
    const zBeta = 0.84; // for power = 0.8

    const n = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2);
    return Math.ceil(n);
  }

  /**
   * Get statistical summary for metrics
   */
  analyzeMetrics(metrics: Record<string, number[]>): StatisticalResult[] {
    const results: StatisticalResult[] = [];

    for (const [name, samples] of Object.entries(metrics)) {
      const ci = this.calculateCI(samples, 0.95);

      results.push({
        metric: name,
        value: ci.mean,
        confidenceInterval: { lower: ci.lower, upper: ci.upper },
        confidenceLevel: 0.95,
        sampleSize: samples.length,
        standardError: ci.standardError,
      });
    }

    return results;
  }

  /**
   * Create hypothesis test result
   */
  createHypothesisTest(
    hypothesis: string,
    control: number[],
    variant: number[]
  ): HypothesisTest {
    const result = this.tTest(control, variant);

    return {
      id: genId('test'),
      hypothesis,
      controlValue: control.reduce((a, b) => a + b, 0) / control.length,
      variantValue: variant.reduce((a, b) => a + b, 0) / variant.length,
      testType: 't-test',
      statistic: result.tStatistic,
      pValue: result.pValue,
      significant: result.significant,
      effectSize: result.effectSize,
    };
  }

  /**
   * Interpret effect size
   */
  interpretEffectSize(d: number): string {
    const absD = Math.abs(d);
    if (absD < 0.2) return 'negligible';
    if (absD < 0.5) return 'small';
    if (absD < 0.8) return 'medium';
    return 'large';
  }

  /**
   * Format p-value for display
   */
  formatPValue(p: number): string {
    if (p < 0.001) return '<0.001';
    if (p < 0.01) return `<${Number((p * 10).toFixed(2)) / 10}`;
    return p.toFixed(3);
  }

  private tDistPValue(t: number, df: number): number {
    // Approximation using normal distribution for large df
    if (df > 30) {
      // Use normal approximation
      return 2 * (1 - this.normalCDF(Math.abs(t)));
    }
    
    // For small samples, use a simpler approximation
    const x = df / (df + t * t);
    return this.betaIncomplete(df / 2, 0.5, x);
  }

  private chiSquarePValue(x: number, df: number): number {
    // Simplified approximation
    if (df <= 2) {
      return Math.exp(-x / 2);
    }
    
    const z = (Math.pow(x / df, 1/3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
    return 2 * (1 - this.normalCDF(Math.abs(z)));
  }

  private normalCDF(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private betaIncomplete(a: number, b: number, x: number): number {
    // Simplified beta incomplete function approximation
    if (x === 0) return 0;
    if (x === 1) return 1;
    
    // Use regularized incomplete beta function approximation
    const lnB = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnB) / a;
    
    return 1 - front;
  }

  private logGamma(x: number): number {
    const c = [
      76.18009172947146, -86.50532032941677,
      24.67009865792417, -1.239165838684812e1,
      1.07769380319057e-2, 9.999999999999999e-1,
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      ser += c[j] / ++y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
}

// Singleton
export const researchConfidenceService = new ResearchConfidenceService();