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
    } else {
        document.getElementById('score-explanation').textContent = "Данные пока не введены. Добавьте первую запись ниже.";
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

    renderChart();
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
