import type {
    IContributionService,
    ContributionGraph,
    ContributionDay,
} from '../contracts/contribution';

function generateYearOfContributions(): ContributionGraph {
    const weeks: { days: ContributionDay[] }[] = [];
    let total = 0;
    const now = new Date();
    for (let w = 0; w < 52; w++) {
        const days: ContributionDay[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (52 * 7 - w * 7 - d));
            const count = Math.random() < 0.4 ? Math.floor(Math.random() * 12) : 0;
            total += count;
            let level: ContributionDay['level'] = 0;
            if (count > 8) level = 4;
            else if (count > 5) level = 3;
            else if (count > 3) level = 2;
            else if (count > 0) level = 1;
            days.push({ date: date.toISOString().split('T')[0], count, level });
        }
        weeks.push({ days });
    }
    return { weeks, totalContributions: total, currentStreak: 5, longestStreak: 23 };
}

/**
 * @deprecated MOCK — simulated backend. Replace with real implementation before production use.
 */
export class ContributionService implements IContributionService {
    private graph: ContributionGraph = generateYearOfContributions();

    getGraph(): ContributionGraph {
        return {
            weeks: this.graph.weeks.map((w) => ({ days: w.days.map((d) => ({ ...d })) })),
            totalContributions: this.graph.totalContributions,
            currentStreak: this.graph.currentStreak,
            longestStreak: this.graph.longestStreak,
        };
    }

    getContributionsByDateRange(start: string, end: string): ContributionDay[] {
        const all = this.graph.weeks.flatMap((w) => w.days);
        return all.filter((d) => d.date >= start && d.date <= end).map((d) => ({ ...d }));
    }

    getStreak(): { current: number; longest: number } {
        return { current: this.graph.currentStreak, longest: this.graph.longestStreak };
    }
}
