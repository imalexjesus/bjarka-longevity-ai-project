/**
 * Professional Grooming Guide for Samoyeds
 * Based on breed standards and "Line Brushing" techniques.
 */

export const groomingZones = {
    "1": { 
        name: "Уши и Голова", 
        text: "Зона за ушами — самое нежное место, где чаще всего образуются колтуны. Используйте гребень с вращающимися зубьями. Проверяйте зону пальцами перед расчесыванием.",
        tool: "comb"
    },
    "2": { 
        name: "Воротник (Ruff)", 
        text: "Самая густая часть меха. Применяйте технику 'Line Brushing': одной рукой раздвигайте шерсть до кожи, другой — вычесывайте пуходеркой слой за слоем снизу вверх.",
        tool: "slicker"
    },
    "3": { 
        name: "Грудь и Плечи", 
        text: "Здесь подшерсток наиболее плотный. Используйте грабли (rake), чтобы вытянуть старый пух. Двигайтесь короткими 'гребущими' движениями по направлению роста волос.",
        tool: "rake"
    },
    "4": { 
        name: "Спина и Бока", 
        text: "Основная поверхность тела. После проработки пуходеркой обязательно проверьте глубину гребнем — он должен проходить до самой кожи без сопротивления.",
        tool: "slicker"
    },
    "5": { 
        name: "Передние Лапы", 
        text: "Чешите против роста шерсти, чтобы придать объем и удалить мертвый волос из длинных очесов. Осторожно подстригайте шерсть между подушечками лап.",
        tool: "slicker"
    },
    "6": { 
        name: "Живот и Подмышки", 
        text: "Зона высокого трения. Кожа здесь очень тонкая. Будьте предельно осторожны, используйте только мягкую пуходерку или разбирайте узлы руками.",
        tool: "slicker"
    },
    "7": { 
        name: "Задние Лапы (Панталоны)", 
        text: "Место самой активной линьки. Требует тщательной проработки граблями. Шерсть должна рассыпаться как облако, не образуя 'сбитых' участков.",
        tool: "rake"
    },
    "8": { 
        name: "Хвост", 
        text: "Никогда не используйте жесткие грабли на хвосте! Только мягкая пуходерка. Волос на хвосте растет очень долго, его потерю сложно восстановить.",
        tool: "slicker"
    }
};

export function initGrooming() {
    const hotspots = document.querySelectorAll('.groom-spot');
    const toolCards = document.querySelectorAll('.tool-card');
    
    // Zone Hotspots logic
    hotspots.forEach(spot => {
        spot.addEventListener('click', () => {
            const zoneId = spot.dataset.zone;
            showZoneDetail(zoneId);
            
            // UI Feedback
            hotspots.forEach(s => s.style.fill = 'rgba(14,165,233,0.3)');
            spot.style.fill = 'rgba(14,165,233,0.8)';
            
            // Highlight matching tool
            const zone = groomingZones[zoneId];
            toolCards.forEach(c => {
                c.classList.toggle('active', c.dataset.tool === zone.tool);
            });
        });
    });

    // Tool Cards logic
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            toolCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            renderToolContext(card.dataset.tool);
        });
    });

    // Default view
    renderToolContext('slicker');
}

function showZoneDetail(id) {
    const zone = groomingZones[id];
    if (!zone) return;

    const titleEl = document.getElementById('selected-tool-name');
    const overlay = document.getElementById('grooming-overlay');
    const zoomPanel = document.getElementById('zoom-details');

    titleEl.textContent = `ЗОНА ${id}: ${zone.name}`;
    overlay.innerHTML = `
        <div class="instruction-box animated-fade">
            <div class="instruction-title">Профессиональный совет</div>
            <p>${zone.text}</p>
            <div style="margin-top: 10px; font-size: 0.8rem; color: var(--primary-blue);">
                Рекомендуемый инструмент: <strong>${translateTool(zone.tool)}</strong>
            </div>
        </div>
    `;
    zoomPanel.classList.add('hidden');
}

function renderToolContext(toolKey) {
    const titles = {
        slicker: "ПУХОДЕРКА (SLICKER)",
        comb: "ГРЕБЕНЬ (COMB)",
        rake: "ГРАБЛИ (RAKE)"
    };
    const descs = {
        slicker: "Для глубокого вычесывания подшерстка и основного объема шерсти.",
        comb: "Контрольный инструмент для поиска скрытых колтунов и финишной отделки.",
        rake: "Мощный инструмент для удаления вылинявшего подшерстка в период линьки."
    };

    const titleEl = document.getElementById('selected-tool-name');
    const overlay = document.getElementById('grooming-overlay');
    
    titleEl.textContent = titles[toolKey] || "Инструкция";
    overlay.innerHTML = `
        <p style="color: var(--text-secondary); margin-bottom: 20px;">${descs[toolKey]}</p>
        <div class="instruction-box">
            <p>Нажмите на <strong>синие точки</strong> на схеме собаки, чтобы узнать, как правильно обрабатывать конкретную зону этим инструментом.</p>
        </div>
    `;
}

function translateTool(key) {
    const map = { slicker: "Пуходерка", comb: "Гребень", rake: "Грабли" };
    return map[key] || key;
}
