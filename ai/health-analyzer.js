/**
 * Health Analyzer for Bjarka
 * Calculates a health score (0-100) based on weight, activity, and symptoms.
 */

class HealthAnalyzer {
    constructor(logs) {
        this.logs = logs;
    }

    calculateScore() {
        if (!this.logs || this.logs.length === 0) return 0;

        const latest = this.logs[this.logs.length - 1];
        let score = 100;

        // 1. Weight Stability (Target: ~22.5 kg for Samoyed female)
        const targetWeight = 22.5;
        const weightDiff = Math.abs(latest.weight - targetWeight);
        if (weightDiff > 1) score -= 10;
        if (weightDiff > 2) score -= 20;

        // 2. Activity Levels (Target: >40 minutes/day)
        if (latest.activity_minutes < 40) score -= 15;
        if (latest.activity_minutes < 20) score -= 15;

        // 3. Symptoms
        if (latest.symptoms && latest.symptoms.length > 0) {
            score -= (latest.symptoms.length * 15);
        }

        // 4. Appetite
        if (latest.appetite === "Low") score -= 20;
        if (latest.appetite === "Normal") score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    getTrend() {
        if (this.logs.length < 2) return "Stable";
        const latest = this.logs[this.logs.length - 1].weight;
        const previous = this.logs[this.logs.length - 2].weight;
        
        if (latest < previous - 0.5) return "Decreasing";
        if (latest > previous + 0.5) return "Increasing";
        return "Stable";
    }
}

// Export for use in dashboard or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthAnalyzer;
}
