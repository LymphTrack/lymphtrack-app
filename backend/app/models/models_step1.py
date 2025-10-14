import os
import json
from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy import text

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    f1_score, accuracy_score, roc_auc_score,
    confusion_matrix, roc_curve
)
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier, RandomForestClassifier
import joblib


DATA_DIR = "app/data"
MODEL_PATH = os.path.join(DATA_DIR, "step1_model.pkl")
RESULTS_PATH = os.path.join(DATA_DIR, "step1_results.json")



def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _position_to_side(position: int) -> int:
    """
    Map position -> side code used dans ta base:
    1 = RIGHT, 2 = LEFT
    - positions 1,2,3 -> LEFT (2)
    - positions 4,5,6 -> RIGHT (1)
    """
    if position in (1, 2, 3):
        return 2  # LEFT
    return 1      # RIGHT


def _clean_healthy_side(val: str | None) -> int | None:
    if val is None:
        return None
    s = str(val).strip().upper()
    if s in ("L", "LEFT", "2"):
        return 2
    if s in ("R", "RIGHT", "1"):
        return 1
    return None


def train_step1_model(db_session):
    """
    Recalcule le modèle Step 1 (détection binaire) à partir des tables SQL:
      - results (mesures)
      - operations (pour retrouver patient_id + nom d'opération)
      - sick_patients (side malade)
      - healthy_patients (moyennes par position)
      - healthy_metadata (côté 'healthy')

    Sauvegarde:
      - app/data/step1_model.pkl
      - app/data/step1_results.json

    Retourne un dict {status, message}.
    """
    _ensure_data_dir()
    print("[STEP1] 🔄 Recalcul Step 1…")

    # 1) === Récup données MALADES (mesures réelles) ===
    # results ⟶ join operations pour retrouver patient_id + operation name
    # on garde la moyenne par patient/operation/position (si plusieurs measurement_number)
    q_sick = text("""
        SELECT
            o.patient_id AS patient,
            o.name       AS operation_name,
            r.position   AS position,
            AVG(r.min_return_loss_db) AS min_return_loss,
            AVG(r.min_frequency_hz)   AS min_frequency,
            AVG(r.bandwidth_hz)       AS bandwidth
        FROM results r
        JOIN operations o ON o.id_operation = r.id_operation
        GROUP BY o.patient_id, o.name, r.position
    """)
    sick_raw = pd.read_sql(q_sick, db_session.bind)
    sick_raw["patient"] = sick_raw["patient"].astype(str)

    if sick_raw.empty:
        msg = "[STEP1] ⚠️ Aucune donnée dans results/operations."
        print(msg)
        return {"status": "error", "message": msg}

    # Joindre le côté malade depuis sick_patients (1=R, 2=L, 3=Bil)
    q_meta_sick = text("""
        SELECT patient_id AS patient, lymphedema_side
        FROM sick_patients
    """)
    sick_side_df = pd.read_sql(q_meta_sick, db_session.bind)
    sick_side_df["patient"] = sick_side_df["patient"].astype(str)

    sick_df = sick_raw.merge(sick_side_df, on="patient", how="left")

    # On ne garde que les opérations "PreOP" pour coller à ton protocole step1
    sick_df = sick_df[sick_df["operation_name"].str.contains("PreOP", case=False, na=False)].copy()
    if sick_df.empty:
        msg = "[STEP1] ⚠️ Aucune ligne PreOP dans les malades."
        print(msg)
        return {"status": "error", "message": msg}

    sick_df["label"] = 1

    # 2) === Récup données SAINES (moyennes déjà agrégées par position) ===
    # healthy_patients: columns = patient_id, position, average_min_*  (d'après ton modèle)
    q_healthy = text("""
        SELECT
            hp.patient_id AS patient,
            hp.position   AS position,
            hp.average_min_return_loss_db AS min_return_loss,
            hp.average_min_frequency_hz   AS min_frequency,
            hp.average_bandwidth_hz       AS bandwidth
        FROM healthy_patients hp
    """)
    healthy_df = pd.read_sql(q_healthy, db_session.bind)
    healthy_df["patient"] = healthy_df["patient"].astype(str)

    if healthy_df.empty:
        msg = "[STEP1] ⚠️ Aucune donnée dans healthy_patients."
        print(msg)
        return {"status": "error", "message": msg}

    # healthy_metadata : patient_id, healthy_side (string, LEFT/RIGHT…)
    q_hmeta = text("""
        SELECT patient_id AS patient, healthy_side
        FROM healthy_metadata
    """)
    hmeta_df = pd.read_sql(q_hmeta, db_session.bind)
    hmeta_df["patient"] = hmeta_df["patient"].astype(str)

    if not hmeta_df.empty:
        hmeta_df["healthy_side"] = hmeta_df["healthy_side"].map(_clean_healthy_side)
    healthy_df = healthy_df.merge(hmeta_df, on="patient", how="left")
    healthy_df["label"] = 0

    # 3) === Harmoniser colonnes & concaténer malade/sain ===
    # Pour les malades, pas de 'healthy_side' : on utilise 'lymphedema_side'
    sick_df["healthy_side"] = np.nan  # placeholder
    cols_needed = ["patient", "position", "min_return_loss", "min_frequency", "bandwidth",
                   "label", "operation_name", "lymphedema_side", "healthy_side"]
    for c in cols_needed:
        if c not in sick_df.columns:
            sick_df[c] = np.nan

    healthy_df["operation_name"] = None
    if "lymphedema_side" not in healthy_df.columns:
        healthy_df["lymphedema_side"] = np.nan

    combined = pd.concat(
        [sick_df[cols_needed], healthy_df[cols_needed]],
        ignore_index=True
    ).dropna(subset=["patient", "position"])

    # 4) === Calcul des diffs patient-niveau (sick vs healthy side) ===
    # On a besoin de connaître le côté à comparer:
    #   - pour malades: side = lymphedema_side (1=R,2=L; si 3=bilatéral → on skip)
    #   - pour sains:   side = healthy_side (1=R,2=L)
    combined["position_side"] = combined["position"].apply(_position_to_side)

    rows = []
    for patient_id, group in combined.groupby("patient"):
        # Déterminer le "side de référence"
        # On regarde d'abord s'il y a des lignes malades:
        grp_mal = group[group["label"] == 1]
        grp_sain = group[group["label"] == 0]

        label = int(group["label"].max())  # 1 si malade présent, sinon 0
        if label == 1:
            # malade
            # on prend le side le plus fréquent (au cas où) et on ignore 3 (bilatéral)
            sides = grp_mal["lymphedema_side"].dropna().astype(float)
            if sides.empty:
                continue
            # enlever '3' (bilateral) sinon pas de réference claire
            sides = sides[sides.isin([1.0, 2.0])]
            if sides.empty:
                # pas de side exploitable
                continue
            sick_side = int(sides.mode().iloc[0])
            healthy_side = 1 if sick_side == 2 else 2
        else:
            # sain
            hs = grp_sain["healthy_side"].dropna().astype(float)
            if hs.empty:
                continue
            healthy_side = int(hs.mode().iloc[0])
            sick_side = 1 if healthy_side == 2 else 2

        sick_data = group[group["position_side"] == sick_side]
        healthy_data = group[group["position_side"] == healthy_side]

        if sick_data.empty or healthy_data.empty:
            continue

        # Moyennes par côté
        sick_mean = sick_data[["min_frequency", "min_return_loss", "bandwidth"]].mean()
        healthy_mean = healthy_data[["min_frequency", "min_return_loss", "bandwidth"]].mean()

        # Diffs (sick - healthy), on prendra l'absolu ensuite dans le modèle
        freq_diff = sick_mean["min_frequency"] - healthy_mean["min_frequency"]
        loss_diff = sick_mean["min_return_loss"] - healthy_mean["min_return_loss"]
        bw_diff   = sick_mean["bandwidth"]     - healthy_mean["bandwidth"]

        rows.append({
            "patient": str(patient_id),
            "freq_diff": float(freq_diff),
            "loss_diff": float(loss_diff),
            "bw_diff": float(bw_diff),
            "label": int(label)
        })

    patient_df = pd.DataFrame(rows)
    if patient_df.empty or patient_df["label"].nunique() < 2:
        msg = "[STEP1] ⚠️ Dataset insuffisant (vide ou une seule classe)."
        print(msg)
        return {"status": "error", "message": msg}

    # Utiliser l'absolu des différences (comme dans ton pipeline recherche)
    patient_df[["freq_diff", "loss_diff", "bw_diff"]] = patient_df[["freq_diff", "loss_diff", "bw_diff"]].abs()

    # Nettoyage final — suppression des lignes avec NaN dans les features
    patient_df = patient_df.dropna(subset=["freq_diff", "loss_diff", "bw_diff"]).copy()


    # 5) === Split & entraînement des modèles ===
    X = patient_df[["freq_diff", "loss_diff", "bw_diff"]].copy()
    y = patient_df["label"].astype(int)

    # stratify ok si y a 2 classes
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, stratify=y, test_size=0.4, random_state=42
    )

    models = {
        "AdaBoost": AdaBoostClassifier(n_estimators=100, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(random_state=42),
    }

    results = []
    roc_data = []

    for name, clf in models.items():
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)

        # proba pour ROC; sinon decision_function
        if hasattr(clf, "predict_proba"):
            y_prob = clf.predict_proba(X_test)[:, 1]
        else:
            y_prob = clf.decision_function(X_test)

        f1  = f1_score(y_test, y_pred)
        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        tpr = tp / (tp + fn) if (tp + fn) else 0.0
        tnr = tn / (tn + fp) if (tn + fp) else 0.0
        fpr = fp / (fp + tn) if (fp + tn) else 0.0
        fnr = fn / (tp + fn) if (tp + fn) else 0.0

        results.append({
            "name": name,
            "f1": round(f1, 3),
            "auc": round(auc, 3),
            "accuracy": round(acc, 3),
            "tpr": round(tpr, 3),
            "tnr": round(tnr, 3),
            "fpr": round(fpr, 3),
            "fnr": round(fnr, 3),
        })

        fpr_pts, tpr_pts, _ = roc_curve(y_test, y_prob)
        roc_data.append({
            "model": name,
            "fpr": fpr_pts.tolist(),
            "tpr": tpr_pts.tolist(),
        })

    # 6) === Choix du meilleur modèle (au F1) et sauvegardes ===
    main_model_name = max(results, key=lambda r: r["f1"])["name"]
    best_model = models[main_model_name]

    joblib.dump(best_model, MODEL_PATH)

    cm_best = confusion_matrix(y_test, best_model.predict(X_test)).tolist()
    results_dict = {
        "main_model": main_model_name,
        "model_comparison": results,
        "roc_data": roc_data,
        "confusion_matrix": cm_best,
        "metadata": {
            "n_patients": int(patient_df["patient"].nunique()),
            "n_rows": int(len(patient_df)),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
    }

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(results_dict, f, indent=2, ensure_ascii=False)

    print(f"[STEP1] ✅ Modèle: {main_model_name} | rows={len(patient_df)} | patients={patient_df['patient'].nunique()}")
    return {"status": "success", "message": f"Step 1 OK — modèle {main_model_name} sauvegardé."}



def run_step1():
    """Lit le fichier step1_results.json et le renvoie"""
    try:
        with open(RESULTS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"status": "error", "message": "step1_results.json not found"}
