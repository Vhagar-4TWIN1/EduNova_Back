import pandas as pd
from datetime import datetime
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import os

# Vérification du fichier
if not os.path.exists('../user_stats.json'):
    raise FileNotFoundError("⚠️ Le fichier '../user_stats.json' est introuvable. Exécute d'abord 'aggregateStats.js'.")

# Charger les données
df = pd.read_json('../user_stats.json')
df.rename(columns={'_id': 'userId'}, inplace=True)

# Vérification des colonnes
required_cols = ['last_activity', 'total_actions', 'total_duration', 'nb_login', 'nb_lesson']
if not all(col in df.columns for col in required_cols):
    raise ValueError("❌ Colonnes manquantes dans les données JSON.")

# Nettoyage des dates
df['last_activity'] = pd.to_datetime(df['last_activity'], errors='coerce').dt.tz_localize(None)
df = df.dropna(subset=['last_activity'])  # Supprime les lignes invalides

# Calcul de l'inactivité
df['days_since_last_activity'] = (datetime.now() - df['last_activity']).dt.days

# 🟡 SEUIL AJUSTÉ : 5 jours (au lieu de 15) pour générer les deux classes
SEUIL_DECROCHAGE = 5
df['dropout'] = df['days_since_last_activity'].apply(lambda x: 1 if x > SEUIL_DECROCHAGE else 0)

# Sélection des features
X = df[['total_actions', 'total_duration', 'nb_login', 'nb_lesson', 'days_since_last_activity']]
y = df['dropout']

# Diagnostique du déséquilibre
print("✔️ Valeurs dans 'dropout' (0 = actif, 1 = décrocheur) :\n", y.value_counts(), "\n")

# Vérification de la cible
if y.nunique() < 2:
    raise ValueError("❌ Données insuffisantes ou déséquilibrées : il faut au moins un 0 et un 1 dans 'dropout'.")

# Split des données
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Modèle
model = XGBClassifier(use_label_encoder=False, eval_metric='logloss')
model.fit(X_train, y_train)

# Prédictions
probas = model.predict_proba(X_test)[:, 1]

# Résultats
results = X_test.copy()
results['userId'] = df.loc[X_test.index, 'userId'].values
results['real_dropout'] = y_test.values
results['predicted_dropout_probability'] = (probas * 100).round(2)
results['risk_level'] = results['predicted_dropout_probability'].apply(
    lambda p: '🟢 Faible' if p < 30 else ('🟡 Moyen' if p < 70 else '🔴 Élevé')
)

# Affichage
print(results[['userId', 'predicted_dropout_probability', 'risk_level', 'real_dropout']])
print("\n📊 Rapport de classification :")
print(classification_report(y_test, model.predict(X_test)))

# Export CSV
results.to_csv('dropout_predictions.csv', index=False)
print("\n✅ Résultats enregistrés dans 'dropout_predictions.csv'")

import joblib
joblib.dump(model, 'dropout_model.pkl')
