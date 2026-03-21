import { calculateHealthScore } from './ai/health-analyzer.js';
import { analyzeRisk } from './ai/risk-engine.js';
import { getRecommendations } from './ai/recommendation-engine.js';

// No default logs, start fresh or from localStorage
const defaultData = {
    logs: []
};

const profile = {
    name: "Бьярка",
    breed: "Самоед",
    birth_date: "2015-04-26",
    age: "10 years, 11 months",
    target_weight: 22.0,
    target_activity: 60
};

let healthData = JSON.parse(localStorage.getItem('bjarka_health_data')) || defaultData;
let chart;

function init() {
    updateUI();
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('ru-RU');
    
    document.getElementById('log-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addNewLog();
    });
}

function addNewLog() {
    const weight = parseFloat(document.getElementById('weight-input').value);
    const activity = parseInt(document.getElementById('activity-input').value);
    const symptoms = document.getElementById('symptoms-input').value.split(',').map(s => s.trim()).filter(s => s);

    if (isNaN(weight) || isNaN(activity)) return;

    const newEntry = {
        date: new Date().toISOString().split('T')[0],
        weight,
        activity_minutes: activity,
        symptoms,
        diet: profile.diet || "Стандартный рацион",
        mood: "normal"
    };

    healthData.logs.push(newEntry);
    localStorage.setItem('bjarka_health_data', JSON.stringify(healthData));
    updateUI();
    document.getElementById('log-form').reset();
}

function updateUI() {
    const latestLog = healthData.logs.length > 0 ? healthData.logs[healthData.logs.length - 1] : null;
    const score = calculateHealthScore(latestLog, healthData.logs, profile);
    const risk = analyzeRisk(healthData.logs);
    const recs = getRecommendations(score, risk, profile);

    // Update Score
    document.getElementById('health-score-val').textContent = score !== null ? score : '--';
    
    if (latestLog) {
        document.getElementById('score-explanation').textContent = `Индекс основан на весе (${latestLog.weight}кг), активности (${latestLog.activity_minutes}мин) и наличии симптомов (${latestLog.symptoms.length}).`;
        // Assuming latestLog might contain lab results for rendering
        renderLabResults(latestLog.lab_results);
    } else {
        document.getElementById('score-explanation').textContent = "Данные пока не введены. Добавьте первую запись ниже.";
        renderLabResults(null); // No lab data if no logs
    }

    // Update Risk
    const riskEl = document.getElementById('risk-level');
    riskEl.textContent = `Уровень риска: ${risk.level}`;
    riskEl.className = `risk-indicator risk-${risk.level === 'НЕДОСТАТОЧНО ДАННЫХ' ? 'LOW' : risk.level}`;

    // Update Factors
    const factorContainer = document.getElementById('risk-factors');
    factorContainer.innerHTML = risk.factors.length > 0 
        ? risk.factors.map(f => `<p>⚠️ ${f}</p>`).join('')
        : latestLog ? '<p>✅ Значительных рисков не обнаружено.</p>' : '<p>Ожидание данных...</p>';

    // Update Recommendations
    const recContainer = document.getElementById('recommendations-container');
    recContainer.innerHTML = recs.map(r => `
        <div class="recommendation-item">
            <span class="priority-${r.priority}">[${r.priority}]</span> ${r.text}
        </div>
    `).join('');

    // Update score gauge color based on score (and potentially alerts)
    updateScoreGauge(score);

    // Render alerts (if any, based on risk or other factors)
    // This part assumes 'risk' object might contain alerts or a separate alert mechanism exists.
    // For now, we'll pass an empty array or derive from risk.factors if they are considered alerts.
    // If a dedicated alert system is implemented, this call would be updated.
    renderAlerts(risk.factors.map(f => ({ type: 'WARNING', message: f, category: 'risk' })));

    renderChart();
}

function updateScoreGauge(score) {
    const progressCircle = document.querySelector('.gauge-progress');
    const scoreVal = document.getElementById('score-value');
    
    // Total circumference = 2 * PI * 90 = 565.48
    const circumference = 565.48;
    const offset = circumference - (score / 100) * circumference;
    
    if (progressCircle) progressCircle.style.strokeDashoffset = offset;
    if (scoreVal) scoreVal.textContent = Math.round(score);

    // Color feedback
    if (progressCircle) {
        if (score < 40) progressCircle.style.stroke = 'var(--accent-red)';
        else if (score < 75) progressCircle.style.stroke = 'var(--accent-yellow)';
        else progressCircle.style.stroke = 'var(--accent-green)';
    }
}

function renderAlerts(alerts) {
    const list = document.getElementById('alert-list');
    if (!list) return;

    list.innerHTML = '';

    if (alerts.length === 0) {
        list.innerHTML = '<div class="alert-item">✅ All systems normal. No immediate risks detected.</div>';
        return;
    }

    alerts.forEach(alert => {
        const item = document.createElement('div');
        item.className = `alert-item ${alert.type.toLowerCase()}`;
        let icon = '🔔';
        if (alert.type === 'CRITICAL') icon = '⚠️';
        if (alert.category === 'lab') icon = '🧪';
        
        item.innerHTML = `
            <span class="alert-icon">${icon}</span>
            <div>
                <strong>${alert.type}</strong>: ${alert.message}
            </div>
        `;
        list.appendChild(item);
    });
}

function renderLabResults(lab) {
    const container = document.getElementById('lab-results-container');
    if (!container) return;

    if (!lab) {
        container.innerHTML = '<p style="color: var(--text-dim);">No recent lab data available.</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: flex; gap: 2rem; margin-top: 1rem;">
            <div class="lab-metric ${lab.ALP_flag === 'H' ? 'flag-h' : ''}">
                <label>ALP</label>
                <value>${lab.ALP} U/l</value>
                <span>${lab.ALP_flag || 'Normal'}</span>
            </div>
            <div class="lab-metric ${lab.MPV_flag === 'L' ? 'flag-l' : ''}">
                <label>MPV</label>
                <value>${lab.MPV} fL</value>
                <span>${lab.MPV_flag || 'Normal'}</span>
            </div>
        </div>
        ${lab.conclusion ? `
        <div class="lab-conclusion" style="margin-top: 1.5rem; background: rgba(79, 70, 229, 0.1); padding: 1rem; border-radius: 1rem; border: 1px solid var(--primary);">
            <h4 style="color: var(--primary); margin-bottom: 0.5rem; font-size: 0.875rem;">📋 Clinical Conclusion:</h4>
            <p style="font-size: 0.9375rem; line-height: 1.6;">${lab.conclusion}</p>
        </div>` : ''}
        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-dim); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
            ${lab.notes}
        </p>
    `;
}

function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    const labels = healthData.logs.map(l => l.date);
    const weights = healthData.logs.map(l => l.weight);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Вес (кг)',
                data: weights,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

init();
