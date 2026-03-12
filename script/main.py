import argparse
import glob
import json
import matplotlib.pyplot as plt
import m2cgen as m2c
import numpy as np
import os
import pandas as pd
import shap
from lightgbm import LGBMClassifier, early_stopping, log_evaluation
from scipy import stats
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.feature_selection import SelectKBest, mutual_info_classif
from sklearn.metrics import classification_report, confusion_matrix, roc_curve, auc
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_val_score

from features import extract_features
from utils import load_json_data, plot_importance

FEATURE_KEYS = [
    "final_vel",
    "vel_std",
    "initial_distance",
    "final_distance",
    "vel_cv",
    "jerk_kurtosis",
    "jerk_max",
    "time_to_peak_jerk_ratio",
    "acc_kurtosis",
    "acc_skewness",
    "deceleration_ratio",
    "done",
    "straightness",
]

def plot_roc_curve(model, X_test, y_test, class_names=None):
    # Get predicted probabilities
    y_pred_proba = model.predict_proba(X_test)

    # Convert labels to binary format ('pointing' = 1, 'scroll' = 0)
    # Check class order
    if class_names is None:
        class_names = model.classes_

    # Set 'pointing' as the positive class (1)
    if 'pointing' in class_names and 'scroll' in class_names:
        pointing_idx = list(class_names).index('pointing')
        # Use probability of pointing class
        y_scores = y_pred_proba[:, pointing_idx]
        # Convert true labels to binary
        y_true_binary = (y_test == 'pointing').astype(int)
        positive_label = 'pointing'
    else:
        # Default: use first class as positive class
        y_scores = y_pred_proba[:, 1] if y_pred_proba.shape[1] > 1 else y_pred_proba[:, 0]
        y_true_binary = (y_test == class_names[1]).astype(int) if len(class_names) > 1 else (y_test == class_names[0]).astype(int)
        positive_label = class_names[1] if len(class_names) > 1 else class_names[0]

    # Compute ROC curve
    fpr, tpr, thresholds = roc_curve(y_true_binary, y_scores)
    roc_auc = auc(fpr, tpr)

    # Plot
    plt.figure(figsize=(8, 8))
    plt.plot(fpr, tpr, color='darkorange', lw=2, 
             label=f'ROC curve (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', 
             label='Random classifier (AUC = 0.500)')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title(f'ROC Curve (Positive class: {positive_label})', fontsize=14)
    plt.legend(loc="lower right", fontsize=11)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    
    # Save
    output_path = 'dist/roc_curve.png'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"ROC curve saved to {output_path}")
    print(f"AUC: {roc_auc:.4f}")
    plt.close()

def train(X_train, y_train, X_test, y_test):
    model = LGBMClassifier(
        learning_rate=0.1,
        n_estimators=1000,
        random_state=42,
        class_weight='balanced',
        max_depth=5,
        num_leaves=32,
        min_child_samples=20,
        colsample_bytree=0.8,
        importance_type='gain',
        verbose=-1,
    )
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        eval_metric="binary_logloss",
        callbacks=[
            early_stopping(stopping_rounds=50),
            log_evaluation(period=10)
        ]
    )
    return model

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--window-size", type=int, required=True)
    parser.add_argument("--hold-out-validation", action="store_true", default=True)
    parser.add_argument("--cross-validation", action="store_true", default=True)
    args = parser.parse_args()

    processed_data = []
    labels = []
    df_all = load_json_data("data")

    print("Feature keys:")
    print(",".join(FEATURE_KEYS))

    # Extract features for each trial, cutting off at the window size
    print("\nTraining gesture classification model...")
    for trial_id, group in df_all.groupby('trial_id'):
        start_time = group['t'].min()
        early_phase = group[group['t'] <= start_time + args.window_size]
        features = extract_features(early_phase, group['t'].max())
        features = {k: features[k] for k in FEATURE_KEYS if k in features}

        processed_data.append(features)
        labels.append(group['label'].iloc[0]) # 'pointing' or 'scroll'

    X = pd.DataFrame(processed_data)
    y = np.array(labels)
    X = X.fillna(0)

    # Hold-out validation
    if args.hold_out_validation:
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )
        model = train(X_train, y_train, X_test, y_test)
        y_pred = model.predict(X_test)
        print(classification_report(y_test, y_pred))
    
        # Plot SHAP values
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_test)
        shap.summary_plot(shap_values, X_test, show=False)
        plt.savefig("dist/shap_summary.png", dpi=300, bbox_inches="tight")
        plt.close()

        shap.summary_plot(shap_values, X_test, plot_type="bar", show=False)
        plt.savefig("dist/shap_summary_bar.png", dpi=300, bbox_inches="tight")
        plt.close()

        # Plot feature importances
        print("\nPlotting feature importances...")
        plot_importance(model, FEATURE_KEYS)

        # Plot ROC curve and AUC
        print("\nPlotting ROC curve...")
        plot_roc_curve(model, X_test, y_test)

        # Export model to Python
        print("\nExporting model to Python...")
        py_code = m2c.export_to_python(model)
        with open("dist/model.py", "w") as f:
            f.write(py_code)

        # Export model to JavaScript
        print("\nExporting model to JavaScript...")
        code = m2c.export_to_javascript(model)
        with open("dist/model.js", "w") as f:
            f.write(code)

    # Cross-validation
    if args.cross_validation:
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = []
        all_y_true = []
        all_y_pred = []

        for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
            X_train, X_test = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_test = y[train_idx], y[val_idx]
            model = train(X_train, y_train, X_test, y_test)
            y_pred = model.predict(X_test)
            score = model.score(X_test, y_test)

            cv_scores.append(score)
            all_y_true.extend(y_test)
            all_y_pred.extend(y_pred)
        
        all_y_true = np.array(all_y_true)
        all_y_pred = np.array(all_y_pred)
        cm = confusion_matrix(all_y_true, all_y_pred, labels=np.unique(y))

        print(f"\nCV Average Accuracy: {np.mean(cv_scores):.4f} (SD = {np.std(cv_scores):.4f})")
        print(cm)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )
        model = train(X_train, y_train, X_test, y_test)
        plot_roc_curve(model, X_test, y_test)
