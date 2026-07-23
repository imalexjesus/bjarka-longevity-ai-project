/**
 * Health Analyzer Module
 * Calculates Health Score based on weight, activity, and symptoms.
 */

const WEIGHT_WEIGHT = 0.3;
const ACTIVITY_WEIGHT = 0.3;
const SYMPTOMS_WEIGHT = 0.4;

export function calculateHealthScore(latestLog, previousLogs, profile) {
    if (!latestLog) return null;
    
    let score = 100;

    // 1. Weight Analysis (30%)
    if (profile.target_weight && latestLog.weight) {
        const weightDiff = Math.abs(latestLog.weight - profile.target_weight);
        const weightPenalty = Math.min(weightDiff * 10, 30); // Max 30 points penalty
        score -= weightPenalty;
    }

    // 2. Activity Analysis (30%)
    if (latestLog.activity_minutes !== undefined) {
        const targetActivity = profile.target_activity || 60;
        if (latestLog.activity_minutes < targetActivity) {
            const activityDeficit = targetActivity - latestLog.activity_minutes;
            const activityPenalty = Math.min((activityDeficit / targetActivity) * 30, 30);
            score -= activityPenalty;
        }
    }

    // 3. Symptoms Analysis (40%)
    if (latestLog.symptoms && latestLog.symptoms.length > 0) {
        const symptomPenalty = Math.min(latestLog.symptoms.length * 20, 40);
        score -= symptomPenalty;
    }

    return Math.max(Math.round(score), 0);
}
