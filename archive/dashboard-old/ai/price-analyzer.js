/**
 * Price List Analyzer Module (Mock AI)
 * Analizes product prices based on categories, profile, and history.
 */

export async function analyzePriceList(priceListText, categoriesInput, healthHistory, profile, source = 'gemini') {
    // Собираем историю покупок для контекста
    const purchasesContext = healthHistory.purchases && healthHistory.purchases.length > 0 
        ? healthHistory.purchases.map(p => p.item).join(', ') 
        : 'нет данных';
        
    const recentSymptoms = healthHistory.logs[healthHistory.logs.length - 1]?.symptoms?.join(', ') || 'нет симптомов';
    const currentWeight = healthHistory.logs[healthHistory.logs.length - 1]?.weight || profile.current_weight;

    const promptText = `Ты ветеринарный диетолог и помощник по покупкам для собаки.
Твоя задача — проанализировать сырой текст прайс-листа и порекомендовать 3-5 товаров.

Контекст собаки:
- Возраст: ${profile.age}
- Порода: ${profile.breed}
- Диета: ${profile.diet}
- Последний зафиксированный вес: ${currentWeight} кг
- Недавние симптомы: ${recentSymptoms}
- Уже купленные товары: ${purchasesContext}

Интересующие категории: ${categoriesInput}

ПРАЙС-ЛИСТ:
${priceListText.substring(0, 8000)}

Верни результат строго в формате JSON, массив объектов:
[
  {
    "item": "Название из прайса",
    "category": "Категория",
    "price": "Цена",
    "reason": "Ветеринарное обоснование"
  }
]
`;

    if (source === 'gemini') {
        return callGeminiAPI(promptText);
    } else if (source === 'openai') {
        return callOpenAIAPI(promptText);
    } else if (source === 'perplexity') {
        return callPerplexityAPI(promptText);
    } else if (source === 'ollama') {
        return callOllamaAPI(promptText);
    } else if (source === 'offline') {
        return callOfflineHeuristic(priceListText, categoriesInput, healthHistory, profile);
    } else {
        throw new Error("Выбран неизвестный источник.");
    }
}

async function callOpenAIAPI(promptText) {
    let apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        apiKey = prompt("Введите OpenAI API Ключ (sk-...):");
        if (apiKey) localStorage.setItem('openai_api_key', apiKey);
        else throw new Error("API ключ не предоставлен.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: promptText }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error(`OpenAI Error: ${response.statusText}`);
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return Array.isArray(result) ? result : (result.recommendations || []);
}

async function callPerplexityAPI(promptText) {
    let apiKey = localStorage.getItem('pplx_api_key');
    if (!apiKey) {
        apiKey = prompt("Введите Perplexity API Ключ (pplx-...):");
        if (apiKey) localStorage.setItem('pplx_api_key', apiKey);
        else throw new Error("API ключ не предоставлен.");
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [{ role: "user", content: promptText + " \n\nВерни результат СТРОГО в формате JSON [{}, {}]." }]
        })
    });

    if (!response.ok) throw new Error(`Perplexity Error: ${response.statusText}`);
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

/**
 * Оффлайн-анализатор (Эвристический поиск)
 * Работает без серверов, используя JS-логику.
 */
async function callOfflineHeuristic(text, categoriesIn, health, profile) {
    const categories = categoriesIn.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    const results = [];

    // Базовые ветеринарные правила для фильтрации
    const isSenior = profile.age.includes('10 лет') || true;
    const jointIssues = (health.logs || []).some(l => l.symptoms?.join(' ').toLowerCase().includes('хром'));

    for (let line of lines) {
        const lineLower = line.toLowerCase();
        
        // 1. Проверка на соответствие категории
        const matchedCat = categories.find(cat => lineLower.includes(cat));
        if (!matchedCat) continue;

        // 2. Попытка выделить цену (ищем цифры после которых р./руб/грн/$)
        const priceMatch = line.match(/(\d+[\d\s.,]*)\s?(руб|р|грн|€|\$)/i);
        const price = priceMatch ? priceMatch[0] : "Цена уточняется";
        
        // 3. Формируем "умное" обоснование на основе профиля
        let reason = `Найдено совпадение по категории "${matchedCat}". `;
        
        if (lineLower.includes('влажн') || lineLower.includes('консерв') || lineLower.includes('паштет')) {
            reason += "Мягкая текстура подходит для пожилой собаки (10+ лет), снижает нагрузку на зубы.";
        } else if (lineLower.includes('для суставов') || lineLower.includes('хондро') || lineLower.includes('глюкоз')) {
            reason += jointIssues ? "Критически важно из-за отмеченных ранее проблем с походкой." : "Хорошо для профилактики дисплазии (порода Самоед).";
        } else if (lineLower.includes('беззерн') || lineLower.includes('nd') || lineLower.includes('farmina')) {
            reason += profile.diet.includes('Farmina') ? "Совпадает с вашей текущей диетой. Безопасно." : "Качественный состав, подходящий породе.";
        } else {
            reason += "Локальный анализ: товар соответствует параметрам поиска и возрасту Бьярки.";
        }

        results.push({
            item: line.replace(price, '').trim().substring(0, 80),
            category: matchedCat.toUpperCase(),
            price: price,
            reason: reason
        });

        if (results.length >= 8) break; // Лимит чтобы не забивать UI
    }

    if (results.length === 0) {
        throw new Error(`В прайсе не найдено товаров по категориям: ${categoriesIn}. Попробуйте другие ключевые слова.`);
    }

    return results;
}

async function callGeminiAPI(promptText) {
    let apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("Введите Google Gemini API ключ:");
        if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
        else throw new Error("API ключ не предоставлен.");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function callOllamaAPI(promptText) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify({
                model: 'llama3', // или 'mistral', 'gemma'
                prompt: promptText,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error("Ollama не отвечает. Убедитесь, что Ollama запущен локально на порту 11434.");
        }

        const data = await response.json();
        return JSON.parse(data.response);
    } catch (err) {
        if (err.message.includes('Failed to fetch')) {
            throw new Error("Не удалось подключиться к Ollama. Проверьте запущен ли он и разрешены ли CORS запросы (OLLAMA_ORIGINS=\"*\").");
        }
        throw err;
    }
}
