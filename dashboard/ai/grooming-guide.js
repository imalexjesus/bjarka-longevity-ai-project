/**
 * Grooming Guide Logic
 * Provides interactive data and instructions for grooming tools.
 */

const groomingData = {
    slicker: {
        name: "ИНСТРУКЦИЯ: ПУХОДЕРКА (SLICKER)",
        description: "Для глубокого вычесывания подшерстка и удаления мертвых волос.",
        steps: [
            {
                title: "1. ПОСЛОЙНАЯ ПРОРАБОТКА",
                text: "Разделите шерсть горизонтально. Чешите снизу вверх, слой за слоем.",
                points: [{x: 400, y: 300}, {x: 400, y: 150}],
                zoom: { text: "Угол 45° к коже.", svg: '<path d="M10,80 L50,40 L90,80" stroke="#0ea5e9" stroke-width="4" fill="none"/>' }
            },
            {
                title: "2. ВОРОТНИК (ШЕЯ)",
                text: "У самоедов самая мощная грива. Чешите круговыми движениями от ушей к лопаткам.",
                points: [{x: 200, y: 180}, {x: 350, y: 220}]
            },
            {
                title: "3. ПУШИСТЫЙ ХВОСТ",
                text: "Хвост вычесывается от основания к кончику, очень аккуратно, чтобы не выдрать остевой волос.",
                points: [{x: 650, y: 200}, {x: 750, y: 120}]
            }
        ]
    },
    comb: {
        name: "ИНСТРУКЦИЯ: ГРЕБЕНЬ (COMB)",
        description: "Контрольный инструмент для поиска колтунов.",
        steps: [
            {
                title: "ЗОНА ЗА УШАМИ",
                text: "Самое нежное место, где чаще всего образуются колтуны. Используйте гребень с вращающимися зубьями.",
                points: [{x: 170, y: 120}, {x: 130, y: 140}],
                zoom: { text: "Если нашли узелок — не тяните, разберите его пальцами.", svg: '<circle cx="50" cy="50" r="30" stroke="#ef4444" stroke-width="2" fill="none"/><path d="M40,50 L60,50" stroke="#ef4444" stroke-width="4"/>' }
            },
            {
                title: "ФИНИШ: ПАНТАЛОНЫ",
                text: "Проверьте гребнем 'штаны' на задних лапах. Шерсть должна рассыпаться как облако.",
                points: [{x: 550, y: 400}, {x: 600, y: 500}]
            }
        ]
    },
    undecoat: {
        name: "ИНСТРУКЦИЯ: ГРАБЛИ (UNDERCOAT RAKE)",
        description: "Для удаления линяющего подшерстка в период активной линьки.",
        steps: [
            {
                title: "РАБОТА С ПОДШЕРСТКОМ",
                text: "Двигайтесь по росту шерсти, не нажимая сильно на инструмент.",
                points: [{x: 300, y: 100}, {x: 450, y: 150}],
                zoom: { text: "Грабли должны плавно скользить, зацепляя только 'лишний' пух.", svg: '<rect x="20" y="40" width="60" height="20" rx="4" fill="#0ea5e9"/><path d="M30,60 L30,80 M50,60 L50,80 M70,60 L70,80" stroke="#0ea5e9" stroke-width="4"/>' }
            }
        ]
    }
};

export function initGrooming(containerId) {
    const selector = document.getElementById('tool-selector');
    const toolCards = selector.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            toolCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            renderToolInstructions(card.dataset.tool);
        });
    });

    // Default
    renderToolInstructions('slicker');
}

function renderToolInstructions(toolKey) {
    const data = groomingData[toolKey];
    document.getElementById('selected-tool-name').textContent = data.name;
    
    const overlay = document.getElementById('grooming-overlay');
    const arrowsLayer = document.getElementById('arrows-layer');
    const zoomPanel = document.getElementById('zoom-details');
    const zoomText = document.getElementById('zoom-text');
    const zoomSvg = document.getElementById('zoom-svg');

    // Clear previous
    arrowsLayer.innerHTML = '';
    overlay.innerHTML = '';

    data.steps.forEach((step, index) => {
        // Render Hotspots and Arrows
        if (step.points && step.points.length >= 2) {
            const p1 = step.points[0];
            const p2 = step.points[1];
            
            // Draw Arrow
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
            arrow.setAttribute("x1", p1.x);
            arrow.setAttribute("y1", p1.y);
            arrow.setAttribute("x2", p2.x);
            arrow.setAttribute("y2", p2.y);
            arrow.setAttribute("marker-end", "url(#arrowhead)");
            arrow.setAttribute("class", "guide-arrow");
            arrowsLayer.appendChild(arrow);

            // Draw Hotspot
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", p1.x);
            circle.setAttribute("cy", p1.y);
            circle.setAttribute("r", "8");
            circle.setAttribute("class", "hotspot");
            arrowsLayer.appendChild(circle);
        }

        // Add Instruction Box
        const box = document.createElement('div');
        box.className = 'instruction-box';
        box.style.marginBottom = '1rem';
        box.innerHTML = `
            <div class="instruction-title">${step.title}</div>
            <p>${step.text}</p>
        `;
        overlay.appendChild(box);

        // Handle Zoom
        if (step.zoom) {
            zoomPanel.classList.remove('hidden');
            zoomText.textContent = step.zoom.text;
            zoomSvg.innerHTML = step.zoom.svg;
        } else {
            zoomPanel.classList.add('hidden');
        }
    });

    // Add arrowhead marker if not exists
    if (!document.getElementById('arrowhead')) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#0ea5e9" />
        </marker>`;
        document.getElementById('samoyed-map').prepend(defs);
    }
}
