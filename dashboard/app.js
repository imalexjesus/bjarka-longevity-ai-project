import { calculateHealthScore } from './ai/health-analyzer.js';
import { analyzeRisk } from './ai/risk-engine.js';
import { getRecommendations } from './ai/recommendation-engine.js';
import { analyzePriceList } from './ai/price-analyzer.js';
import { initGrooming } from './ai/grooming-guide.js';
import { nocoService } from './ai/nocodb-service.js';

// Data from 21.03.2026 veterinary visit
const defaultData = {
    logs: [
        {
            date: "2026-03-01",
            weight: 27.8,
            activity_minutes: 45,
            symptoms: [],
            appetite: "Good"
        },
        {
            date: "2026-03-10",
            weight: 27.6,
            activity_minutes: 60,
            symptoms: [],
            appetite: "Good"
        },
        {
            "date": "2026-03-21",
            "weight": 31.0,
            "activity_minutes": 0,
            "symptoms": ["post_surgery_recovery", "stitches"],
            "medications": [
            "Синулокс 250мг (1т х 2р)", 
            "Хлоргексидин 0.05% (обработка швов)",
            "Габапентин 300мг (по назначению)"
            ],
            "diet": "Recovery Diet",
            "temperature": 38.0,
            "lab_results": {
                "ALP": 88,
                "MPV": 7.7,
                "conclusion": "Для 10 лет 8 месяцев результаты оптимистичны. ALP (88) незначительно повышен. ЭХО сердца: норма для возраста, незначительная гипертрофия.",
                "notes": "Хирургическое удаление опухоли, биохимия и ОАК в норме."
            },
            "mood": "recovering"
        }
    ],
    purchases: [] // Хранение принятых рекомендаций
};

const profile = {
    name: "Бьярки",
    breed: "Самоед",
    sex: "Female",
    age: "10 лет 8 месяцев",
    current_weight: 31.0,
    target_weight: 25.0,
    target_activity: 45,
    diet: "Farmina N&D Pumpkin Lamb"
};

let healthData = defaultData; // Force override for demo of new data. Use JSON.parse(localStorage.getItem('bjarki_health_data')) later.
let chart;

// --- THEME LOGIC ---
const THEME_KEY = 'bjarki_theme';
let isDarkTheme = localStorage.getItem(THEME_KEY) === 'dark';

if (isDarkTheme) document.body.classList.add('dark-theme');

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.textContent = isDarkTheme ? '☀️' : '🌙';
    
    themeBtn.addEventListener('click', () => {
        isDarkTheme = !isDarkTheme;
        document.body.classList.toggle('dark-theme', isDarkTheme);
        themeBtn.textContent = isDarkTheme ? '☀️' : '🌙';
        localStorage.setItem(THEME_KEY, isDarkTheme ? 'dark' : 'light');
        renderChart(); // redraw chart to update colors
    });
});

function init() {
    updateUI();
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('log-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addNewLog();
    });

    // --- VIEW ROUTING ---
    const navLinks = {
        'nav-dashboard': 'dashboard-view',
        'nav-history': 'history-view',
        'nav-diet': 'diet-view',
        'nav-analyzer': 'analyzer-view',
        'nav-grooming': 'grooming-view',
        'nav-settings': 'settings-view'
    };

    // Config NocoDB
    document.getElementById('nocodb-config-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNocoConfig();
    });

    document.getElementById('analyzer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAnalyzerSubmit();
    });

    // Preset chips logic
    const presetButtons = document.querySelectorAll('.preset-btn');
    const categoryInput = document.getElementById('analyzer-categories');
    
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            updateCategoriesFromPresets();
        });
    });

    function updateCategoriesFromPresets() {
        const activeVals = Array.from(document.querySelectorAll('.preset-btn.active')).map(b => b.dataset.val);
        categoryInput.value = activeVals.join(', ');
    }

    // Manual purchase form logic
    document.getElementById('manual-purchase-form').addEventListener('submit', (e) => {
        e.preventDefault();
        addManualPurchase();
    });

    Object.keys(navLinks).forEach(navId => {
        document.getElementById(navId).addEventListener('click', (e) => {
            e.preventDefault();
            switchView(navLinks[navId], navId);
        });
    });
}

function switchView(viewName, navId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    // Remove active class from nav
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    // Show target view
    document.getElementById(viewName).classList.remove('hidden');
    document.getElementById(navId).classList.add('active');

    // Specific logic per view
    if (viewName === 'history-view') renderHistory();
    if (viewName === 'diet-view') renderDiet();
    if (viewName === 'grooming-view') initGrooming();
}

function renderHistory() {
    const container = document.getElementById('history-table-container');
    if (!container) return;

    const logs = [...healthData.logs].reverse();
    const purchases = healthData.purchases ? [...healthData.purchases].reverse() : [];
    
    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Вес</th>
                    <th>Активность</th>
                    <th>Симптомы</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>${log.date}</td>
                        <td>${log.weight} кг</td>
                        <td>${log.activity_minutes} мин</td>
                        <td>${log.symptoms.length > 0 ? log.symptoms.join(', ') : '---'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    if (purchases.length > 0) {
        html += `
            <h3 style="margin-top: 2rem;">ИСТОРИЯ ПОКУПОК / РЕКОМЕНДАЦИЙ</h3>
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Категория</th>
                        <th>Товар</th>
                        <th style="width: 40%;">Обоснование</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(p => `
                        <tr>
                            <td>${p.date}</td>
                            <td><span class="risk-badge">${p.category}</span></td>
                            <td><strong>${p.item}</strong></td>
                            <td><span class="text-sm">${p.reason}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    container.innerHTML = html;
}

async function handleAnalyzerSubmit() {
    const fileInput = document.getElementById('analyzer-file');
    const categoriesInput = document.getElementById('analyzer-categories').value;
    const aiSource = document.getElementById('analyzer-source').value;
    
    if (fileInput.files.length === 0) return;
    
    document.getElementById('analyzer-loading').classList.remove('hidden');
    document.getElementById('analyzer-results').innerHTML = ''; // clear
    
    const file = fileInput.files[0];
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        let text = "";
        
        if (isExcel) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                // Собираем текст со всех листов
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    text += XLSX.utils.sheet_to_csv(sheet) + "\n";
                });
            } catch (err) {
                console.error("Excel Error:", err);
                document.getElementById('analyzer-results').innerHTML = `<p class="text-sm" style="color:var(--accent-red)">Ошибка чтения Excel: ${err.message}</p>`;
                document.getElementById('analyzer-loading').classList.add('hidden');
                return;
            }
        } else {
            text = e.target.result;
        }
        
        try {
            // Передаем весь объект healthData (чтобы история покупок тоже была видна ИИ)
            const recs = await analyzePriceList(text, categoriesInput, healthData, profile, aiSource);
            renderAnalyzerResults(recs);
        } catch(err) {
            console.error(err);
            document.getElementById('analyzer-results').innerHTML = `<p class="text-sm" style="color:var(--accent-red)">Ошибка анализа: ${err.message}</p>`;
        } finally {
            document.getElementById('analyzer-loading').classList.add('hidden');
        }
    };
    
    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function renderAnalyzerResults(recs) {
    const container = document.getElementById('analyzer-results');
    if (recs.length === 0) {
        container.innerHTML = '<p class="text-sm">Подходящих товаров не найдено.</p>';
        return;
    }
    
    container.innerHTML = recs.map((r) => `
        <div class="recommendation-card">
            <span class="cat-badge">${r.category}</span>
            <h4>${r.item}</h4>
            <div class="price">${r.price}</div>
            <div class="reason">${r.reason}</div>
            <button class="accept-btn" onclick="acceptRecommendation('${encodeURIComponent(JSON.stringify(r))}')">Принять рекомендацию</button>
        </div>
    `).join('');
}

window.acceptRecommendation = function(encodedRec) {
    const rec = JSON.parse(decodeURIComponent(encodedRec));
    
    if (!healthData.purchases) healthData.purchases = [];
    
    healthData.purchases.push({
        date: new Date().toISOString().split('T')[0],
        item: rec.item,
        category: rec.category,
        reason: rec.reason
    });
    
    localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
    
    alert(`Товар "${rec.item}" успешно добавлен в историю покупок! В будущем ИИ будет учитывать это при рекомендациях.`);
    
    renderHistory(); // Refresh history view behind the scenes
};

function addManualPurchase() {
    const date = document.getElementById('purchase-date').value;
    const category = document.getElementById('purchase-category').value;
    const item = document.getElementById('purchase-item').value;
    
    if (!date || !item) return;
    
    if (!healthData.purchases) healthData.purchases = [];
    
    healthData.purchases.push({
        date,
        item,
        category,
        reason: "Добавлено вручную пользователем"
    });
    
    localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
    document.getElementById('manual-purchase-form').reset();
    renderHistory();
    alert("Покупка добавлена в историю!");
}

function renderDiet() {
    const container = document.getElementById('diet-details');
    if (!container) return;

    container.innerHTML = `
        <div class="diet-info">
            <p><strong>Текущий рацион:</strong> ${profile.diet}</p>
            <p><strong>Целевой вес:</strong> ${profile.target_weight} кг</p>
            <p><strong>Дневная активность:</strong> ${profile.target_activity} мин</p>
            <hr style="margin: 1rem 0; border: 0; border-top: 1px solid var(--border-color);">
            <h3>Рекомендации по диете:</h3>
            <ul class="text-sm" style="padding-left: 1.5rem; margin-top: 0.5rem;">
                <li>Кормить 2 раза в день равными порциями.</li>
                <li>Избегать лакомств с высоким содержанием жира.</li>
                <li>Всегда обеспечивать доступ к свежей воде.</li>
                <li>После операции (21.03.2026) рекомендуется дробное питание.</li>
            </ul>
        </div>
    `;
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
    localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
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
        container.innerHTML = '<p class="text-sm">No recent lab data</p>';
        return;
    }

    container.innerHTML = `
        <div class="lab-metric">
            <span class="lbl">ALP</span>
            <span class="val" style="color: ${lab.ALP_flag === 'H' ? 'var(--accent-red)' : 'var(--text-dark)'}">${lab.ALP} U/l</span>
        </div>
        <div class="lab-metric">
            <span class="lbl">MPV</span>
            <span class="val" style="color: ${lab.MPV_flag === 'L' ? 'var(--accent-blue)' : 'var(--text-dark)'}">${lab.MPV} fL</span>
        </div>
    `;
}

function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    const labels = healthData.logs.map(l => l.date);
    const weights = healthData.logs.map(l => l.weight);

    if (chart) chart.destroy();

    const textColor = isDarkTheme ? '#94a3b8' : '#475569';
    const gridColor = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Вес (кг)',
                data: weights,
                borderColor: '#0ea5e9',
                backgroundColor: isDarkTheme ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { color: gridColor }, 
                    ticks: { color: textColor } 
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: textColor } 
                }
            }
        }
    });
}

init();
