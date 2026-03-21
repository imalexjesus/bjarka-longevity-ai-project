/**
 * Risk Engine for Bjarka
 * Detects health risks and generates alerts.
 */

class RiskEngine {
    constructor(logs) {
        this.logs = logs;
    }

    getAlerts() {
        const alerts = [];
        if (!this.logs || this.logs.length < 2) return alerts;

        const latest = this.logs[this.logs.length - 1];
        const previous = this.logs[this.logs.length - 2];

        // 1. Weight Risk (>5% change)
        const weightChange = Math.abs((latest.weight - previous.weight) / previous.weight);
        if (weightChange > 0.05) {
            alerts.push({
                type: "CRITICAL",
                message: `Significant weight change detected: ${((latest.weight - previous.weight)).toFixed(1)} kg`,
                category: "weight"
            });
        }

        // 2. Activity Risk
        if (latest.activity_minutes < 30 && previous.activity_minutes > 45) {
            alerts.push({
                type: "WARNING",
                message: "Sharp drop in activity levels noticed.",
                category: "activity"
            });
        }

        // 3. Symptom Persistence
        const recentSymptoms = this.logs.slice(-3).flatMap(l => l.symptoms);
        const uniqueSymptoms = [...new Set(recentSymptoms)];
        
        uniqueSymptoms.forEach(symptom => {
            const count = recentSymptoms.filter(s => s === symptom).length;
            if (count >= 2) {
                alerts.push({
                    type: "CRITICAL",
                    message: `Persistent symptom detected: ${symptom} (${count} times recently)`,
                    category: "symptoms"
                });
            }
        });

        // 4. Appetite Warning
        if (latest.appetite === "Low") {
            alerts.push({
                type: "WARNING",
                message: "Poor appetite reported today.",
                category: "nutrition"
            });
        }

        // 5. Lab Alerts
        if (latest.lab_results) {
            if (latest.lab_results.ALP_flag === "H") {
                alerts.push({
                    type: "WARNING",
                    message: `Elevated ALP (${latest.lab_results.ALP} U/l). Monitor liver/bone markers.`,
                    category: "lab"
                });
            }
            if (latest.lab_results.MPV_flag === "L") {
                alerts.push({
                    type: "NOTE",
                    message: `Low MPV (${latest.lab_results.MPV} fL). Normal if other platelet metrics are fine.`,
                    category: "lab"
                });
            }
        }

        return alerts;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskEngine;
}
