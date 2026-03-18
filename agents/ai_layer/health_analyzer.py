import json
import os

class HealthAnalyzer:
    def __init__(self, profile_path):
        self.profile_path = profile_path
        self.breed_standards = {
            "Samoyed": {
                "weight_range_kg": [16, 30],
                "common_risks": ["Hip Dysplasia", "Diabetes", "Glaucoma"]
            }
        }

    def load_profile(self):
        if not os.path.exists(self.profile_path):
            return None
        with open(self.profile_path, 'r') as f:
            return json.load(f)

    def analyze(self):
        profile = self.load_profile()
        if not profile:
            return "Profile not found."

        name = profile.get("name", "Unknown")
        breed = profile.get("breed", "Unknown")
        weight = profile.get("weight")
        
        analysis = []
        analysis.append(f"Analyzing health for {name} ({breed})...")

        if breed in self.breed_standards:
            standard = self.breed_standards[breed]
            if weight:
                try:
                    w = float(weight)
                    min_w, max_w = standard["weight_range_kg"]
                    if w < min_w:
                        analysis.append(f"ALERT: Weight ({w}kg) is below breed standard minimum ({min_w}kg).")
                    elif w > max_w:
                        analysis.append(f"ALERT: Weight ({w}kg) is above breed standard maximum ({max_w}kg).")
                    else:
                        analysis.append(f"Weight ({w}kg) is within normal breed range.")
                except ValueError:
                    analysis.append(f"ERROR: Invalid weight format: {weight}")
            else:
                analysis.append("MISSING: Weight data is required for a full analysis.")
        else:
            analysis.append(f"NOTE: No breed standards found for {breed}. Generic analysis applied.")

        return "\n".join(analysis)

if __name__ == "__main__":
    # Example usage
    analyzer = HealthAnalyzer(r"c:\Users\aj\Documents\AI_ANTIGRAV\bjarka-longevity-ai-project\profile\bjarka-profile.json")
    print(analyzer.analyze())
