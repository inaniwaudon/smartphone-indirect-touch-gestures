import numpy as np
import pandas as pd
from scipy import stats

def extract_features(trial_df, max_t):
    """
    Extract features from a single trial DataFrame (start to 500ms).
    """
    # Shift timestamps to start from 0 (relative time)
    start_t = trial_df['t'].iloc[0]
    relative_t = trial_df['t'] - start_t

    # Add small epsilon to avoid division by zero
    dt = trial_df['t'].diff().fillna(0) / 1000 + 1e-6

    dx = trial_df['x'].diff().fillna(0)
    dy = trial_df['y'].diff().fillna(0)
    dist = np.sqrt(dx**2 + dy**2)
    vel = dist / dt
    acc = vel.diff().fillna(0) / dt
    jerk = acc.diff().fillna(0) / dt

    # Compute trajectory direction angles
    angles = np.arctan2(dy, dx)
    angle_changes = np.abs(np.diff(angles))
    # Normalize to [-pi, pi] range
    angle_changes = np.minimum(angle_changes, 2 * np.pi - angle_changes)

    features = {}

    # Distance
    n = len(dist)
    features['total_distance'] = dist.sum()
    features['initial_distance'] = dist.iloc[:int(n * 0.4)].sum()
    features['final_distance'] = dist.iloc[int(n * 0.6):].sum()

    # Straightness
    x_displacement = trial_df['x'].iloc[-1] - trial_df['x'].iloc[0]
    y_displacement = trial_df['y'].iloc[-1] - trial_df['y'].iloc[0]
    features['straight_distance'] = np.sqrt(x_displacement ** 2 + y_displacement ** 2)
    features['straightness'] = features['straight_distance'] / (features['total_distance'] + 1e-6)

    # Velocity
    features['vel_mean'] = vel.mean()
    features['vel_std'] = vel.std()
    features['vel_max'] = vel.max()
    features['vel_median'] = vel.median()
    features['vel_cv'] = vel.std() / (vel.mean() + 1e-6)
    features['vel_range'] = vel.max() - vel.min()
    features['vel_skewness'] = stats.skew(vel)
    features['vel_kurtosis'] = stats.kurtosis(vel)

    peak_v_idx = vel.idxmax()
    features['time_to_peak_vel_ratio'] = relative_t.loc[peak_v_idx] / (relative_t.max() + 1e-6)
    n = len(vel)
    features['initial_vel'] = vel.iloc[:int(n * 0.4)].mean()
    features['final_vel'] = vel.iloc[int(n * 0.6):].mean()

    # Acceleration
    features['acc_mean'] = acc.mean()
    features["acc_std"] = acc.std()
    features["acc_max"] = acc.max()
    features["acc_median"] = acc.median()
    features["acc_cv"] = acc.std() / (acc.mean() + 1e-6)
    features['acc_range'] = acc.max() - acc.min()
    features['acc_skewness'] = stats.skew(acc)
    features['acc_kurtosis'] = stats.kurtosis(acc)
    features['deceleration_ratio'] = (acc < 0).sum() / (len(acc) + 1e-6)
    peak_a_idx = acc.idxmax()
    features['time_to_peak_acc_ratio'] = relative_t.loc[peak_a_idx] / (relative_t.max() + 1e-6)

    # Jerk
    features['jerk_mean'] = jerk.mean()
    features['jerk_std'] = jerk.std()
    features['jerk_max'] = jerk.max()
    features['jerk_median'] = jerk.median()
    features['jerk_cv'] = jerk.std() / (jerk.mean() + 1e-6)
    features['jerk_range'] = jerk.max() - jerk.min()
    features['jerk_skewness'] = stats.skew(jerk)
    features['jerk_kurtosis'] = stats.kurtosis(jerk)
    peak_j_idx = jerk.idxmax()
    features['time_to_peak_jerk_ratio'] = relative_t.loc[peak_j_idx] / (relative_t.max() + 1e-6)

    # Angle and directionality
    if len(angle_changes) > 0:
        features['mean_angle_change'] = np.mean(angle_changes)
        features['angle_std'] = np.std(angle_changes)
    else:
        features['mean_angle_change'] = 0
        features['angle_std'] = 0

    # Temporal feature
    features['done'] = int(trial_df["t"].max() == max_t)

    return features
