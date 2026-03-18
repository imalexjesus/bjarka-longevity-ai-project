import json
import os

class RiskEngine:
    def __init__(self, profile_path):
        self.profile_path = profile_path
        self.breed_risks = {
            "Samoyed": [
                {"condition": "Hip Dysplasia", "level": "Medium", "triggers": ["High weight", "High activity"]},
                {"condition": "Diabetes", "level": "Medium", "triggers": ["Obesity", "Age"]},
                {"condition": "VKH-like Syndrome", "level": "Low", "triggers": ["Autoimmune"]},
            ]
        }

    def load_profile(self):
        if not os.path.exists(self.profile_path):
            return None
        with open(self.profile_path, 'r') as f:
            return json.load(f)

    def evaluate_risks(self):
        profile = self.load_profile()
        if not profile:
            return "Profile not found."

        breed = profile.get("breed", "Unknown")
        weight = profile.get("weight")
        conditions = profile.get("conditions", [])

        risk_report = []
        risk_report.append(f"Risk Assessment for {breed}:")

        if breed in self.breed_risks:
            for risk in self.breed_risks[breed]:
                current_level = risk["level"]
                # Dynamic risk adjustment
                if "High weight" in risk["triggers"] and weight:
                    try:
                        if float(weight) > 28: # Arbitrary high end for Samoyed
                            current_level = "High"
                    except ValueError:
                        pass
                
                risk_report.append(f"- {risk['condition']}: {current_level} Risk")
        else:
            risk_report.append("No specific breed risk data available.")

        return "\n".join(risk_report)

if __name__ == "__main__":
    engine = RiskEngine(r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\profile\bjarka-profile.json")
    print(engine.evaluate_risks())
