import os
import re
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS

# Remplace ceci par ta clé API personnelle : https://makersuite.google.com/app/apikey
GOOGLE_API_KEY = "AIzaSyBCQdqFdHAms1u6h3YRfh9rZKh1gP4-y-Q"  # <- Mets ta vraie clé ici
genai.configure(api_key=GOOGLE_API_KEY)

# Utilise un modèle texte compatible avec generate_content()
model = genai.GenerativeModel("models/gemini-1.5-pro-latest")

app = Flask(__name__)
CORS(app)

@app.route('/generate_words', methods=['POST'])
def generate_words():
    data = request.get_json()
    subject = data.get('subject')
    
    if not subject:
        return jsonify({"error": "Subject is required"}), 400

    prompt = f"Give me a list of 10 educational keywords (just the words, no definitions) related to: {subject}. Return only the list of words."

    try:
        response = model.generate_content(prompt)
        text = response.text

        # Clean and extract words from the generated text
        words = [
            re.sub(r"^\d+\.\s*", "", w.strip("-•– ").strip())
            for w in text.split("\n")
            if w.strip() and not w.lower().startswith("here")
        ]

        return jsonify({"words": words})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)