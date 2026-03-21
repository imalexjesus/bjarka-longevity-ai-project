/**
 * Recommendation Engine for Bjarka
 * Generates dietary and health recommendations.
 */

class RecommendationEngine {
    constructor(logs, profile) {
        this.logs = logs;
        this.profile = profile;
    }

    getRecommendations() {
        const recs = [];
        if (!this.logs || this.logs.length === 0) return recs;

        const latest = this.logs[this.logs.length - 1];

        // 1. Joint Health (Samoyeds prone to dysplasia)
        const hasLimping = latest.symptoms.some(s => s.toLowerCase().includes("limp"));
        if (hasLimping) {
            recs.push({
                title: "Joint Support",
                text: "Add Glucosamine & Chondroitin to dinner. Consider a shorter, slower walk.",
                priority: "High"
            });
        }

        // 2. Weight Management
        if (latest.weight > 24) {
            recs.push({
                title: "Weight Control",
                text: "Reduce kibble portion by 10%. Increase low-impact activity.",
                priority: "Medium"
            });
        } else if (latest.weight < 21) {
            recs.push({
                title: "Nutrition Boost",
                text: "Increase caloric intake. Add a high-protein topper.",
                priority: "High"
            });
        }

        // 3. Coat Health (Omega-3)
        recs.push({
            title: "Skin & Coat",
            text: "Add Fish Oil (Omega-3) to support the Samoyed double coat.",
            priority: "Routine"
        });

        // 4. Activity matching
        if (latest.activity_minutes < 30 && !hasLimping) {
            recs.push({
                title: "Exercise",
                text: "Bjarka seems under-stimulated. Try a 15-minute training session or fetch.",
                priority: "Medium"
            });
        }

        // 5. Lab-based Recommendations
        if (latest.lab_results && latest.lab_results.ALP_flag === "H") {
            recs.push({
                title: "Vet Follow-up / UZI",
                text: "Discuss elevated ALP with your vet. Consider an abdominal ultrasound (УЗИ) to check bile ducts.",
                priority: "High"
            });
        }

        // 6. Senior Mobility (based on 11-year age)
        recs.push({
            title: "Senior Mobility Check",
            text: "Monitor how Bjarka stands on her back legs. Look for signs of stiffening or weakness.",
            priority: "Routine"
        });

        // 7. Post-Castration Monitoring (if within 6 months)
        if (this.profile.medical_history && this.profile.medical_history.some(h => h.event.toLowerCase().includes("castration"))) {
            recs.push({
                title: "Post-Surgery Metabolism",
                text: "Castration can slow metabolism in seniors. Monitor weight strictly; you may need to reduce caloric intake by 5-10%.",
                priority: "Medium"
            });
        }

        return recs;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecommendationEngine;
}
