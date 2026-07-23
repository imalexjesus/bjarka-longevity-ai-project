import { calculateHealthScore } from './ai/health-analyzer.js';
import { analyzeRisk } from './ai/risk-engine.js';
import { getRecommendations } from './ai/recommendation-engine.js';
import { initGrooming } from './ai/grooming-guide.js';

// Default data as a fallback if the API is down
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
            date: "2026-03-21",
            weight: 31.0,
            activity_minutes: 0,
            symptoms: ["post_surgery_recovery", "stitches"],
            medications: [
                "Синулокс 250мг (1т х 2р)", 
                "Хлоргексидин 0.05% (обработка швов)",
                "Габапентин 300мг (по назначению)"
            ],
            diet: "Recovery Diet",
            temperature: 38.0,
            lab_results: {
                "ALP": 88,
                "MPV": 7.7,
                "conclusion": "Для 10 лет 8 месяцев результаты оптимистичны. ALP (88) незначительно повышен. ЭХО сердца: норма для возраста, незначительная гипертрофия.",
                "notes": "Хирургическое удаление опухоли, биохимия и ОАК в норме."
            },
            mood: "recovering"
        }
    ],
    purchases: []
};

let healthData = defaultData;
let profile = {
    name: "Бьярки",
    breed: "Самоед",
    sex: "Female",
    age: "10 лет 8 месяцев",
    current_weight: 31.0,
    target_weight: 25.0,
    target_activity: 45,
    diet: "Farmina N&D Pumpkin Lamb"
};

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
        renderChart(); 
    });
});

async function loadData() {
    try {
        const [profileRes, logsRes, purchasesRes] = await Promise.all([
            fetch('/api/profile'),
            fetch('/api/logs'),
            fetch('/api/purchases')
        ]);
        
        if (profileRes.ok) profile = await profileRes.json();
        if (logsRes.ok) healthData.logs = await logsRes.json();
        if (purchasesRes.ok) healthData.purchases = await purchasesRes.json();
        
        localStorage.setItem('bjarki_profile', JSON.stringify(profile));
        localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
    } catch (e) {
        console.warn("Using offline storage fallback:", e);
        profile = JSON.parse(localStorage.getItem('bjarki_profile')) || profile;
        healthData = JSON.parse(localStorage.getItem('bjarki_health_data')) || defaultData;
    }
    updateUI();
}

function init() {
    loadData();
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

    // Config SQLite and Gemini/Ollama
    document.getElementById('settings-config-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSystemSettings();
    });

    document.getElementById('profile-edit-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfileEdit();
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

    // Nutrition Analyzer Form logic
    document.getElementById('nutrition-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleNutritionSubmit();
    });

    Object.keys(navLinks).forEach(navId => {
        document.getElementById(navId).addEventListener('click', (e) => {
            e.preventDefault();
            switchView(navLinks[navId], navId);
        });
    });
}

function switchView(viewName, navId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    document.getElementById(viewName).classList.remove('hidden');
    document.getElementById(navId).classList.add('active');

    if (viewName === 'history-view') renderHistory();
    if (viewName === 'diet-view') renderDiet();
    if (viewName === 'grooming-view') initGrooming();
    if (viewName === 'settings-view') renderSettings();
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
                        <td>${log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : '---'}</td>
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
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(p => `
                        <tr>
                            <td>${p.date}</td>
                            <td><span class="risk-badge">${p.category}</span></td>
                            <td><strong>${p.item}</strong></td>
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
    
    if (fileInput.files.length === 0) return;
    
    document.getElementById('analyzer-loading').classList.remove('hidden');
    document.getElementById('analyzer-results').innerHTML = ''; 
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('categories', categoriesInput);
    
    try {
        const response = await fetch('/api/analyze-price', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        renderMarkdown(data.analysis, 'analyzer-results');
    } catch(err) {
        console.error(err);
        document.getElementById('analyzer-results').innerHTML = `<p class="text-sm" style="color:var(--accent-red)">Ошибка анализа: ${err.message}</p>`;
    } finally {
        document.getElementById('analyzer-loading').classList.add('hidden');
    }
}

async function handleNutritionSubmit() {
    const ingredients = document.getElementById('nutrition-ingredients').value;
    if (!ingredients) return;
    
    const resultsContainer = document.getElementById('nutrition-results');
    resultsContainer.innerHTML = 'Анализируем состав корма с помощью ИИ...';
    
    const formData = new FormData();
    formData.append('ingredients', ingredients);
    
    try {
        const response = await fetch('/api/analyze-nutrition', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        renderMarkdown(data.analysis, 'nutrition-results');
    } catch(err) {
        console.error(err);
        resultsContainer.innerHTML = `<p class="text-sm" style="color:var(--accent-red)">Ошибка анализа: ${err.message}</p>`;
    }
}

async function addManualPurchase() {
    const date = document.getElementById('purchase-date').value;
    const category = document.getElementById('purchase-category').value;
    const item = document.getElementById('purchase-item').value;
    
    if (!date || !item) return;

    const newPurchase = { date, category, item };

    try {
        const res = await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPurchase)
        });
        if (res.ok) {
            healthData.purchases.push(newPurchase);
            document.getElementById('manual-purchase-form').reset();
            renderHistory();
            alert("Покупка добавлена в историю!");
        } else {
            alert("Ошибка сохранения на сервере.");
        }
    } catch (e) {
        alert("Ошибка сети. Сохранено локально.");
        healthData.purchases.push(newPurchase);
        localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
        renderHistory();
    }
}

async function renderSettings() {
    try {
        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        
        document.getElementById('gemini-key').value = settings.gemini_api_key || '';
        document.getElementById('ollama-url-input').value = settings.ollama_url || 'http://localhost:11434';
        
        document.getElementById('profile-target-weight').value = profile.weight_target || profile.target_weight || '';
        document.getElementById('profile-target-activity').value = profile.target_activity || '';
        document.getElementById('profile-diet').value = profile.diet || '';
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
}

async function saveSystemSettings() {
    const key = document.getElementById('gemini-key').value;
    const url = document.getElementById('ollama-url-input').value;
    
    try {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
                { key: 'gemini_api_key', value: key },
                { key: 'ollama_url', value: url }
            ])
        });
        if (res.ok) {
            alert("Настройки ИИ сохранены!");
        } else {
            alert("Ошибка сохранения настроек.");
        }
    } catch (e) {
        alert("Ошибка сети: " + e.message);
    }
}

async function saveProfileEdit() {
    profile.weight_target = parseFloat(document.getElementById('profile-target-weight').value);
    profile.target_weight = profile.weight_target; 
    profile.target_activity = parseInt(document.getElementById('profile-target-activity').value);
    profile.diet = document.getElementById('profile-diet').value;
    
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        if (res.ok) {
            alert("Профиль Бьярки успешно обновлен!");
            updateUI();
        } else {
            alert("Ошибка сохранения профиля.");
        }
    } catch (e) {
        alert("Ошибка сети: " + e.message);
    }
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

async function addNewLog() {
    const weight = parseFloat(document.getElementById('weight-input').value);
    const activity = parseInt(document.getElementById('activity-input').value);
    const symptoms = document.getElementById('symptoms-input').value.split(',').map(s => s.trim()).filter(s => s);

    if (isNaN(weight) || isNaN(activity)) return;

    const newEntry = {
        date: new Date().toISOString().split('T')[0],
        weight,
        activity_minutes: activity,
        symptoms: symptoms.join(','),
        appetite: "Good",
        mood: "normal"
    };

    try {
        const res = await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEntry)
        });
        if (res.ok) {
            await loadData();
            document.getElementById('log-form').reset();
        } else {
            alert("Ошибка сохранения записи.");
        }
    } catch (e) {
        alert("Ошибка сети. Данные сохранены локально.");
        newEntry.symptoms = symptoms;
        healthData.logs.push(newEntry);
        localStorage.setItem('bjarki_health_data', JSON.stringify(healthData));
        updateUI();
    }
}

async function updateUI() {
    const latestLog = healthData.logs.length > 0 ? healthData.logs[healthData.logs.length - 1] : null;
    const score = calculateHealthScore(latestLog, healthData.logs, profile);
    const risk = analyzeRisk(healthData.logs);

    document.getElementById('health-score-val').textContent = score !== null ? score : '--';
    
    if (latestLog) {
        document.getElementById('score-explanation').textContent = `Индекс основан на весе (${latestLog.weight}кг), активности (${latestLog.activity_minutes}мин) и наличии симптомов (${latestLog.symptoms ? latestLog.symptoms.length : 0}).`;
        renderLabResults(latestLog.lab_results);
    } else {
        document.getElementById('score-explanation').textContent = "Данные пока не введены. Добавьте первую запись ниже.";
        renderLabResults(null);
    }

    const riskEl = document.getElementById('risk-level');
    riskEl.textContent = `Уровень риска: ${risk.level}`;
    riskEl.className = `risk-indicator risk-${risk.level === 'НЕДОСТАТОЧНО ДАННЫХ' ? 'LOW' : risk.level}`;

    const factorContainer = document.getElementById('risk-factors');
    factorContainer.innerHTML = risk.factors.length > 0 
        ? risk.factors.map(f => `<p>⚠️ ${f}</p>`).join('')
        : latestLog ? '<p>✅ Значительных рисков не обнаружено.</p>' : '<p>Ожидание данных...</p>';

    updateScoreGauge(score);
    renderAlerts(risk.factors.map(f => ({ type: 'WARNING', message: f, category: 'risk' })));
    renderChart();

    // Fetch rich recommendations from backend Python agents
    try {
        const aiRes = await fetch('/api/recommendations');
        if (aiRes.ok) {
            const aiData = await aiRes.json();
            const recContainer = document.getElementById('recommendations-container');
            recContainer.innerHTML = aiData.recommendations.map(r => `
                <div class="recommendation-item">
                    ${r}
                </div>
            `).join('');
        }
    } catch (e) {
        // Fallback to local JS recommendations
        const recs = getRecommendations(score, risk, profile);
        const recContainer = document.getElementById('recommendations-container');
        recContainer.innerHTML = recs.map(r => `
            <div class="recommendation-item">
                <span class="priority-${r.priority}">[${r.priority}]</span> ${r.text}
            </div>
        `).join('');
    }
}

function updateScoreGauge(score) {
    const progressCircle = document.querySelector('.gauge-progress');
    const scoreVal = document.getElementById('score-value');
    
    const circumference = 565.48;
    const offset = circumference - (score / 100) * circumference;
    
    if (progressCircle) progressCircle.style.strokeDashoffset = offset;
    if (scoreVal) scoreVal.textContent = Math.round(score);

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

// Simple Markdown to HTML converter for AI outputs
function renderMarkdown(markdown, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!markdown) {
        container.innerHTML = '<p class="text-sm">Нет данных для отображения.</p>';
        return;
    }

    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const lines = html.split('\n');
    let inList = false;
    let tableLines = [];
    let inTable = false;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line.startsWith('|')) {
            inTable = true;
            tableLines.push(line);
            continue;
        } else if (inTable && !line.startsWith('|')) {
            inTable = false;
            processedLines.push(parseMarkdownTable(tableLines));
            tableLines = [];
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${line.substring(2)}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (line !== '') {
                processedLines.push(`<p>${line}</p>`);
            }
        }
    }
    
    if (inList) processedLines.push('</ul>');
    if (inTable) processedLines.push(parseMarkdownTable(tableLines));

    container.innerHTML = processedLines.join('\n');
}

function parseMarkdownTable(tableLines) {
    if (tableLines.length < 2) return '';
    
    const parseRow = (rowText) => {
        const cells = rowText.split('|').map(c => c.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        return cells;
    };

    const headers = parseRow(tableLines[0]);
    const bodyRows = tableLines.slice(2).map(parseRow);

    let html = '<table class="markdown-table"><thead><tr>';
    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });
    html += '</tr></thead><tbody>';

    bodyRows.forEach(row => {
        if (row.length === 0) return;
        html += '<tr>';
        row.forEach(cell => {
            html += `<td>${cell}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
}

init();
