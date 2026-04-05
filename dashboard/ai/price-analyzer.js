/**
 * Price List Analyzer Module (Mock AI)
 * Analizes product prices based on categories, profile, and history.
 */

export async function analyzePriceList(priceListText, categoriesInput, healthHistory, profile) {
    let apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        apiKey = prompt("Для реального ИИ-анализа требуется Google Gemini API ключ. Пожалуйста, введите его (он сохранится локально):");
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        } else {
            throw new Error("API ключ не предоставлен. Анализ невозможен.");
        }
    }

    // Собираем историю покупок для контекста
    const purchasesContext = healthHistory.purchases && healthHistory.purchases.length > 0 
        ? healthHistory.purchases.map(p => p.item).join(', ') 
        : 'нет данных';
        
    const recentSymptoms = healthHistory.logs[0]?.symptoms?.join(', ') || 'нет симптомов';
    const currentWeight = healthHistory.logs[0]?.weight || profile.current_weight;

    const promptText = `Ты ветеринарный диетолог и помощник по покупкам для собаки.
Твоя задача — проанализировать сырой текст прайс-листа и порекомендовать 3-5 товаров.

Контекст собаки:
- Возраст: ${profile.age}
- Порода: ${profile.breed}
- Диета: ${profile.diet}
- Последний зафиксированный вес: ${currentWeight} кг
- Недавние симптомы: ${recentSymptoms}
- Уже купленные ранее товары (успешные рекомендации): ${purchasesContext}

Интересующие категории товаров от пользователя: ${categoriesInput}

ПРАЙС-ЛИСТ (сырой текст):
${priceListText.substring(0, 15000)} // Ограничиваем длину если файл слишком большой

Обязательно верни результат строго в формате JSON, без маркдауна, в виде массива объектов. Пример:
[
  {
    "item": "Название товара из прайса",
    "category": "Категория к которой он относится",
    "price": "Указанная цена",
    "reason": "Ваше подробное ветеринарное обоснование (учитывая возраст, породу и симптомы)"
  }
]
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
                localStorage.removeItem('gemini_api_key');
                throw new Error("Неверный API ключ. Обновите страницу и введите его заново.");
            }
            throw new Error(`Ошибка API: ${response.statusText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        
        // Парсим полученный JSON
        const recommendations = JSON.parse(textResponse);
        return recommendations;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}
