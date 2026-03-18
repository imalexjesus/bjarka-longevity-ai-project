/**
 * Recommendation Engine Module
 * Generates actionable advice based on health data and risks.
 */

export function getRecommendations(healthScore, riskData, profile) {
    const recommendations = [];

    if (!healthScore && riskData.level === 'НЕДОСТАТОЧНО ДАННЫХ') {
        recommendations.push({
            priority: 'INFO',
            text: 'Пожалуйста, добавьте сегодняшние показатели веса и активности для начала анализа.'
        });
        return recommendations;
    }

    if (riskData.level === 'ВЫСОКИЙ') {
        recommendations.push({
            priority: 'СРОЧНО',
            text: 'Немедленно проконсультируйтесь с ветеринаром по поводу симптомов и снижения активности.'
        });
    }

    if (riskData.factors.includes('Обнаружено резкое изменение веса')) {
        recommendations.push({
            priority: 'СРЕДНИЙ',
            text: 'Пересмотрите суточную норму калорий и обеспечьте стабильный размер порций.'
        });
    }

    if (healthScore < 80 && riskData.level !== 'ВЫСОКИЙ') {
        recommendations.push({
            priority: 'НИЗКИЙ',
            text: 'Следите за потреблением воды и обеспечьте Бьярке хотя бы 45 минут легкой прогулки сегодня.'
        });
    }

    // Breed specific (Samoyed)
    recommendations.push({
        priority: 'СОВЕТ',
        text: 'Самоеды склонны к дисплазии суставов. Продолжайте давать добавки (Омега-3).'
    });

    return recommendations.sort((a, b) => {
        const priorityOrder = { 'СРОЧНО': 0, 'СРЕДНИЙ': 1, 'НИЗКИЙ': 2, 'СОВЕТ': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    }).slice(0, 3);
}
