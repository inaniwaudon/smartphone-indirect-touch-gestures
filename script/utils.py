import json
import glob
import os
import pandas as pd
import numpy as np

def load_json_data(data_dir="data"):
    """
    Load JSON files from the data directory and convert to a DataFrame.
    """
    all_data = []
    json_files = glob.glob(os.path.join(data_dir, "**", "*.json"), recursive=True)

    for trial_id, json_file in enumerate(json_files):
        with open(json_file, 'r') as f:
            data = json.load(f)

        # Extract label from filename
        filename = os.path.basename(json_file)
        label = filename.split('-')[0]  # 'pointing' or 'scroll'

        # pointing: get target size from JSON
        target_size = None

        if label == 'pointing':
            # Get target size from JSON
            if 'data' in data and 'rects' in data['data']:
                rects = data['data']['rects']
                if rects and len(rects) > 0:
                    # Get the size of the rect corresponding to the target ID
                    if 'targetId' in data['data']:
                        target_id = data['data']['targetId']
                        for rect in rects:
                            if rect.get('id') == target_id:
                                target_size = rect.get('size')
                                break

        # Extract each touch point from gestures data
        if 'data' in data and 'gestures' in data['data']:
            gestures = data['data']['gestures']

            # Process each gesture stroke (sequence of touch points)
            for stroke_idx, stroke in enumerate(gestures):
                # Skip empty strokes
                if len(stroke) == 0:
                    continue

                # Skip strokes longer than 5 seconds
                timestamps = [point_data['timestamp'] for point_data in stroke]
                if max(timestamps) - min(timestamps) > 5000:
                    continue

                for point_data in stroke:
                    if 'point' in point_data and 'timestamp' in point_data:
                        point = point_data['point']
                        all_data.append({
                            'trial_id': f"{trial_id}_{stroke_idx}",
                            'label': label,
                            't': point_data['timestamp'],
                            'x': point['x'],
                            'y': point['y'],
                            'target_size': target_size,
                            'file_path': json_file,
                            'filename': os.path.basename(json_file),
                        })

    all_data = pd.DataFrame(all_data)
    scroll_data = all_data[all_data['label'] == 'scroll']
    pointing_data = all_data[all_data['label'] == 'pointing']
    print(scroll_data['trial_id'].nunique())
    print(pointing_data['trial_id'].nunique())
    return pd.DataFrame(all_data)


def plot_importance(model, feature_names):
    importances = model.feature_importances_
    indices = np.argsort(importances)

    # Print feature importances
    print("\nFeature Importances (Early 200ms):")
    for i in reversed(indices):
        print(f"{importances[i]:.5f} {feature_names[i]}")
