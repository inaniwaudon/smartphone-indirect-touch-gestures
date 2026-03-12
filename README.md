# smartphone-indirect-touch-gesutres

This repository contains the source code of [Exploring Indirect Touch Gestures for Smartphone Interaction within VR Environments](https://doi.org/10.1145/3772363.3798511).


## Overview

This repository consists of the following directories.

- `/server`: WebSocket server
- `/script`: Script for machine learning
- `/web`: Web application for pilot study and demonstration of gesture classification


## Usage

The WebSocket server and the web application run on Node.js 22.17.1 (server and web).
The script for machine learning runs on Python 3.12.3 (script).
The web application has been confirmed to work on the default browsers of iPhone 17 (iOS 26.2.1) and Meta Quest 3 (Horizon OS).


### Launch the WebSocket server

To use the web application, you need to start the WebSocket server in advance.

Execute the following commands.

```bash
cd server

# Install dependencies
yarn

# In default, the server is launched on ws://<YOUR_LOCAL_IP_ADDRESS>:8765
yarn run start
```


### Launch the web application

Edit the following environment variables to `.env`.

```bash:.env
# WebSocket server URL
VITE_WEBSOCKET_URL=ws://172.16.0.1:8765
# Maximum number of trials
VITE_MAX_TRIAL=25
# Distance of the column from the initial position in the scrolling task
VITE_SCROLL_ROW_DISTANCE=30
```

Execute the following commands.

```bash
cd web

# Install dependencies
yarn

# Launch on http://<YOUR_LOCAL_IP_ADDESS>:5173
yarn dev
```

Access the following URL using the browser of a smartphone and an HMD.
The application supports progressive web application (PWA), so adding it to the home screen enables full-screen display.

| Page | Device | URL |
| --- | --- | --- |
| Pointing | Smartphone | <http://YOUR_LOCAL_IP_ADDESS:5173/pointing/?mode=operation> |
| Pointing | HMD | <http://YOUR_LOCAL_IP_ADDESS:5173/pointing/?mode=mirror> |
| Scrolling | Smartphone | <http://YOUR_LOCAL_IP_ADDESS:5173/scrolling/?mode=operation> |
| Scrolling | HMD | <http://YOUR_LOCAL_IP_ADDESS:5173/scrolling?mode=mirror> |
| Gesture classification | Smartphone | <http://YOUR_LOCAL_IP_ADDESS:5173/classification?mode=operation> |
| Gesture classification | HMD | <http://YOUR_LOCAL_IP_ADDESS:5173/classification?mode=mirror> |


### Execute the script for machine learning

Copy the data recorded under `/server/records` to the following directories.

```
script/
└── data/
    ├── pointing-xxxx.json  # Data for a pointing task
    ├── ...
    ├── scroll-xxxx.json    # Data for a scroll task
    └── ...
```

```bash
cp -r server/records script/data
```

Execute the following commands.
The script will output the model in JavaScript as well as the result of hold-out validation and cross-validation.

```bash
cd script

# Install dependencies
pip install -r requirements.txt

# Execute machine learning
python main.py --window-size 200
python main.py --window-size 500
```


## Publication

Yuto Wada, Myungguen Choi, and Buntarou Shizuki. Exploring Indirect Touch Gestures for Smartphone Interaction within VR Environments. In Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems (CHI EA ’26), April 13–17, 2026, Barcelona, Spain. Association for Computing Machinery, 6 pages. <https://doi.org/10.1145/3772363.3798511>. [PDF](https://www.iplab.cs.tsukuba.ac.jp/paper/international/wada_CHIEA2026.pdf) [Video](https://www.iplab.cs.tsukuba.ac.jp/~wada/assets/chiea2026-movie.mp4)

```bibtex
@inproceedings{indirect-gestures,
  author = {Wada, Yuto and Choi, Myungguen and Shizuki, Buntarou},
  title = {Exploring Indirect Touch Gestures for Smartphone Interaction within VR Environments},
  year = {2026},
  isbn = {979840072281},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  url = {https://doi.org/10.1145/3772363.3798511},
  doi = {10.1145/3772363.3798511},
  booktitle = {Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems},
  numpages = {6},
  location = {Barcelona, Spain},
  series = {CHI EA '26}
}
```
