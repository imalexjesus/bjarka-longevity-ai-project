/**
 * Risk Engine Module
 * Analyzes trends and determines risk levels.
 */

export function analyzeRisk(logs) {
    if (!logs || logs.length === 0) return { level: 'НЕДОСТАТОЧНО ДАННЫХ', score: 0, factors: [] };

    const latest = logs[logs.length - 1];
    const factors = [];
    let riskScore = 0;

    // Trend analysis
    if (logs.length > 1) {
        const prev = logs[logs.length - 2];
        const weightChange = latest.weight - prev.weight;
        if (Math.abs(weightChange) > 0.5) {
            factors.push('Обнаружено резкое изменение веса');
            riskScore += 30;
        }
    }

    // Symptom persistence
    const recentSymptoms = logs.slice(-3).map(l => l.symptoms || []);
    const flattenedSymptoms = recentSymptoms.flat();
    if (flattenedSymptoms.length > 2) {
        factors.push('Повторяющиеся или множественные симптомы за последние 3 дня');
        riskScore += 40;
    }

    // Activity trend
    if (logs.length >= 3) {
        const avgActivity = logs.slice(-7).reduce((acc, l) => acc + (l.activity_minutes || 0), 0) / Math.min(logs.length, 7);
        if (latest.activity_minutes < avgActivity * 0.7) {
            factors.push('Значительное снижение активности по сравнению со средним за неделю');
            riskScore += 20;
        }
    }

    let level = 'НИЗКИЙ';
    if (riskScore > 60) level = 'ВЫСОКИЙ';
    else if (riskScore > 30) level = 'СРЕДНИЙ';

    return { level, score: riskScore, factors };
}
