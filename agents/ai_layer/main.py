import sys
import os

# Add the current directory to the search path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from health_analyzer import HealthAnalyzer
from risk_engine import RiskEngine
from recommendation_system import RecommendationSystem

def run_ai_layer(profile_path):
    print("--- Starting bjarki Longevity AI Analysis ---")
    
    # 1. Health Analysis
    analyzer = HealthAnalyzer(profile_path)
    health_analysis = analyzer.analyze()
    print("\n[Health Analyzer Output]:")
    print(health_analysis)

    # 2. Risk Assessment
    engine = RiskEngine(profile_path)
    risk_assessment = engine.evaluate_risks()
    print("\n[Risk Engine Output]:")
    print(risk_assessment)

    # 3. Recommendations
    recommender = RecommendationSystem(profile_path)
    recommendations = recommender.get_recommendations(health_analysis, risk_assessment)
    print("\n[Recommendation System Output]:")
    print(recommendations)

    print("\n--- Analysis Complete ---")

if __name__ == "__main__":
    # Resolve path relative to script directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    profile_path = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "profile", "bjarki-profile.json")
    run_ai_layer(profile_path)
