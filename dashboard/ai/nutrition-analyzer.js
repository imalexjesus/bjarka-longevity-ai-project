/**
 * Dog Nutrition Analyzer Module
 * Focuses on evaluating ingredients, protein sources, and supplements for longevity.
 */

export function analyzeNutrition(foodIngredients, profile) {
    const analysis = {
        score: 100,
        proteinEvaluation: "",
        ingredientsWarning: [],
        supplementsEvaluation: "",
        summary: ""
    };

    const ingredients = foodIngredients.toLowerCase();

    // 1. Compare Protein Source
    const premiumProteins = ["lamb", "ягненок", "salmon", "лосось", "turkey", "индейка", "duck", "утка", "venison", "оленина"];
    const avoidProteins = ["кука", "курица", "chicken", "meat by-products", "мясокостная мука", "свинина", "pork"];

    const hasPremium = premiumProteins.some(p => ingredients.includes(p));
    const hasAvoid = avoidProteins.some(p => ingredients.includes(p));

    if (hasPremium && !hasAvoid) {
        analysis.proteinEvaluation = "Отличный источник белка. Хорошо подходит для пожилых собак с чувствительным пищеварением.";
    } else if (hasPremium && hasAvoid) {
        analysis.proteinEvaluation = "Присутствуют качественные белки, но есть примеси (курица/субпродукты). Возможна аллергическая реакция.";
        analysis.score -= 15;
    } else if (hasAvoid) {
        analysis.proteinEvaluation = "Источник белка может быть тяжелым для усвоения Бьярки или вызывать аллергию.";
        analysis.score -= 30;
    } else {
        analysis.proteinEvaluation = "Основной источник белка неочевиден. Рекомендуется перепроверить состав.";
        analysis.score -= 10;
    }

    // 2. Check Ingredients (Carbs, Fats, Fillers)
    const badFillers = ["corn", "кукуруза", "wheat", "пшеница", "soy", "соя", "bha", "bht", "ethoxyquin"];
    
    badFillers.forEach(filler => {
        if (ingredients.includes(filler)) {
            analysis.ingredientsWarning.push(filler);
            analysis.score -= 10;
        }
    });

    // 3. Evaluate Supplements (Joints, Omega, Digestion)
    const hasOmega = ingredients.includes("omega") || ingredients.includes("омега") || ingredients.includes("fish oil") || ingredients.includes("лососев");
    const hasJointSupport = ingredients.includes("glucosamine") || ingredients.includes("глюкозамин") || ingredients.includes("chondroitin") || ingredients.includes("хондроитин");
    
    const needsJointSupport = profile.age.includes("10") || profile.age.includes("11") || profile.age.includes("12");

    let supplementsFeedback = [];
    if (hasOmega) {
        supplementsFeedback.push("✅ Присутствуют Омега жирные кислоты (полезно для шерсти и снятия воспалений).");
    } else {
        supplementsFeedback.push("❌ Не хватает Омега-3/6. Рекомендуется добавление масла лосося.");
        analysis.score -= 5;
    }

    if (needsJointSupport) {
        if (hasJointSupport) {
            supplementsFeedback.push("✅ Есть поддержка суставов (глюкозамин/хондроитин), что критично для возраста " + profile.age + ".");
        } else {
            supplementsFeedback.push("❌ Отсутствуют хондропротекторы. Для Самоеда " + profile.age + " лучше добавить их отдельно.");
            analysis.score -= 5;
        }
    }
    
    analysis.supplementsEvaluation = supplementsFeedback.join(" ");

    // Setup summary
    if (analysis.score > 85) {
        analysis.summary = "Отличный выбор питания! Полностью соответствует возрастным потребностям.";
    } else if (analysis.score > 60) {
        analysis.summary = "Неплохой рацион, но требует дополнительных добавок для оптимального баланса.";
    } else {
        analysis.summary = "Не рекомендуется. Состав содержит слишком много нежелательных компонентов для стареющей собаки.";
    }

    return analysis;
}
