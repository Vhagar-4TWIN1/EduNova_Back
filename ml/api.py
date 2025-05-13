from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
from datetime import datetime

app = Flask(__name__)
CORS(app)

model = joblib.load('dropout_model.pkl')

@app.route('/predict_all', methods=['GET'])
def predict_all():
    df = pd.read_json('../user_stats.json')
    df.rename(columns={'_id': 'userId'}, inplace=True)
    df['last_activity'] = pd.to_datetime(df['last_activity']).dt.tz_localize(None)
    df['days_since_last_activity'] = (datetime.now() - df['last_activity']).dt.days
    X = df[['total_actions', 'total_duration', 'nb_login', 'nb_lesson', 'days_since_last_activity']]
    probas = model.predict_proba(X)[:, 1]
    df['dropout_probability'] = (probas * 100).round(2)
    df['risk_level'] = df['dropout_probability'].apply(
        lambda p: '🟢 Faible' if p < 30 else ('🟡 Moyen' if p < 70 else '🔴 Élevé')
    )
    return jsonify(df.to_dict(orient='records'))

if __name__ == '__main__':
    app.run(port=5000, debug=True)
