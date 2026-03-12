import type { GestureData } from "@/libs/data";
import { score } from "@/routes/classification/model.js";

const CLASSIFICATION_INTERVAL = 200;

export interface TouchPoint {
	t: number; // milliseconds
	x: number;
	y: number;
}

interface Features {
	// Coordinates
	total_distance: number;
	initial_distance: number;
	final_distance: number;

	// Linearity
	straight_distance: number;
	straightness: number;

	// Velocity
	vel_mean: number;
	vel_std: number;
	vel_max: number;
	vel_median: number;
	vel_cv: number;
	vel_range: number;
	vel_skewness: number;
	vel_kurtosis: number;
	time_to_peak_vel_ratio: number;
	initial_vel: number;
	final_vel: number;

	// Acceleration
	acc_mean: number;
	acc_std: number;
	acc_max: number;
	acc_median: number;
	acc_cv: number;
	acc_range: number;
	acc_skewness: number;
	acc_kurtosis: number;
	deceleration_ratio: number;
	time_to_peak_acc_ratio: number;

	// Jerk
	jerk_mean: number;
	jerk_std: number;
	jerk_max: number;
	jerk_median: number;
	jerk_cv: number;
	jerk_range: number;
	jerk_skewness: number;
	jerk_kurtosis: number;
	time_to_peak_jerk_ratio: number;

	// Angle / Directionality
	mean_angle_change: number;
	angle_std: number;

	// Temporal features
	done: number;
}

/**
 * Extract features from touch points
 * Same logic as the extract_features function in /script/main3.py
 */
const extractFeatures = (buffer: TouchPoint[], maxT: number): Features => {
	const epsilon = 1e-6;
	const startT = buffer[0].t;
	const relativeT = buffer.map((p) => p.t - startT);

	// Compute differences and distances
	const dts: number[] = [epsilon];
	const dxs: number[] = [0];
	const dys: number[] = [0];
	const dists: number[] = [0];
	const velocities: number[] = [0];

	for (let i = 1; i < buffer.length; i++) {
		const dt = (buffer[i].t - buffer[i - 1].t) / 1000 + epsilon;
		const dx = buffer[i].x - buffer[i - 1].x;
		const dy = buffer[i].y - buffer[i - 1].y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const vel = dist / dt;
		dts.push(dt);
		dxs.push(dx);
		dys.push(dy);
		dists.push(dist);
		velocities.push(vel);
	}

	// Compute accelerations
	const accelerations: number[] = [0];
	for (let i = 1; i < velocities.length; i++) {
		const acc = (velocities[i] - velocities[i - 1]) / dts[i];
		accelerations.push(acc);
	}

	// Compute jerks
	const jerks: number[] = [0];
	for (let i = 1; i < accelerations.length; i++) {
		const jerk = (accelerations[i] - accelerations[i - 1]) / dts[i];
		jerks.push(jerk);
	}

	// Compute angles (direction of trajectory)
	const angles: number[] = [];
	const angleChanges: number[] = [];
	for (let i = 1; i < buffer.length; i++) {
		const dx = dxs[i];
		const dy = dys[i];
		const angle = Math.atan2(dy, dx);
		angles.push(angle);
	}
	for (let i = 1; i < angles.length; i++) {
		let angleChange = Math.abs(angles[i] - angles[i - 1]);
		// Normalize to [-pi, pi] range
		angleChange = Math.min(angleChange, 2 * Math.PI - angleChange);
		angleChanges.push(angleChange);
	}

	// Helper functions
	const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

	const mean = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0);

	const median = (arr: number[]) => {
		if (arr.length === 0) return 0;
		const sorted = arr.slice().sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	};

	const std = (arr: number[], ddof = 1) => {
		if (arr.length <= ddof) return 0;
		const m = mean(arr);
		return Math.sqrt(
			arr.map((x) => (x - m) ** 2).reduce((a, b) => a + b, 0) /
				(arr.length - ddof),
		);
	};

	const skewness = (arr: number[]) => {
		if (arr.length < 3) return 0;
		const m = mean(arr);
		const s = std(arr);
		if (s === 0) return 0;
		const n = arr.length;
		const skew =
			(n / ((n - 1) * (n - 2))) *
			arr.reduce((sum, x) => sum + ((x - m) / s) ** 3, 0);
		return Number.isNaN(skew) || !Number.isFinite(skew) ? 0 : skew;
	};

	// Kurtosis: subtract 3 at the end for excess kurtosis
	const kurtosis = (arr: number[]) => {
		if (arr.length < 4) return 0;
		const m = mean(arr);
		const s = std(arr, 0); // SciPy default uses population standard deviation
		if (s === 0) return 0;
		const n = arr.length;
		// Subtract 3 at the end to match Fisher's definition (excess kurtosis)
		const part1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
		const part2 = arr.reduce((sum, x) => sum + ((x - m) / s) ** 4, 0);
		const part3 = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
		return part1 * part2 - part3;
	};

	const n = velocities.length;
	const getInitial = <T>(x: T[]) => x.slice(0, Math.floor(n * 0.4));
	const getFinal = <T>(x: T[]) => x.slice(Math.floor(n * 0.6));
	const getTimeToPeakRatio = (arr: number[]) => {
		const peakId = arr.indexOf(Math.max(...arr));
		return relativeT[peakId] / (relativeT[relativeT.length - 1] + epsilon);
	};

	// Coordinates
	const total_distance = dists.reduce((a, b) => a + b, 0);
	const initial_distance = sum(getInitial(dists));
	const final_distance = sum(getFinal(dists));

	// Linearity
	const x_displacement = buffer.at(-1)!.x - buffer[0].x;
	const y_displacement = buffer.at(-1)!.y - buffer[0].y;
	const straight_distance = Math.sqrt(
		x_displacement ** 2 + y_displacement ** 2,
	);
	const straightness = straight_distance / total_distance + epsilon;

	// Acceleration
	const decelerationCount = accelerations.filter((a) => a < 0).length;
	const deceleration_ratio =
		decelerationCount / (accelerations.length + epsilon);

	// Temporal features
	const done = buffer[buffer.length - 1].t === maxT ? 1 : 0;

	return {
		// Coordinates
		total_distance,
		initial_distance,
		final_distance,

		// Linearity
		straight_distance,
		straightness,

		// Velocity
		vel_mean: mean(velocities),
		vel_std: std(velocities),
		vel_max: Math.max(...velocities),
		vel_median: median(velocities),
		vel_cv: std(velocities) / (mean(velocities) + epsilon),
		vel_range: Math.max(...velocities) - Math.min(...velocities),
		vel_skewness: skewness(velocities),
		vel_kurtosis: kurtosis(velocities),
		time_to_peak_vel_ratio: getTimeToPeakRatio(velocities),
		initial_vel: mean(getInitial(velocities)),
		final_vel: mean(getFinal(velocities)),

		// Acceleration
		acc_mean: mean(accelerations),
		acc_std: std(accelerations),
		acc_max: Math.max(...accelerations),
		acc_median: median(accelerations),
		acc_cv: std(accelerations) / (mean(accelerations) + epsilon),
		acc_range: Math.max(...accelerations) - Math.min(...accelerations),
		acc_skewness: skewness(accelerations),
		acc_kurtosis: kurtosis(accelerations),
		deceleration_ratio,
		time_to_peak_acc_ratio: getTimeToPeakRatio(accelerations),

		// Jerk
		jerk_mean: mean(jerks),
		jerk_std: std(jerks),
		jerk_max: Math.max(...jerks),
		jerk_median: median(jerks),
		jerk_cv: std(jerks) / (mean(jerks) + epsilon),
		jerk_range: Math.max(...jerks) - Math.min(...jerks),
		jerk_skewness: skewness(jerks),
		jerk_kurtosis: kurtosis(jerks),
		time_to_peak_jerk_ratio: getTimeToPeakRatio(jerks),

		// Angle / Directionality
		mean_angle_change: mean(angleChanges),
		angle_std: std(angleChanges, 0),

		// Temporal features
		done,
	};
};

/**
 * Classify a gesture
 */
export const classify = (
	gesture: GestureData[],
	touchup: boolean,
): "pointing" | "scroll" | "undefined" => {
	const touchPoints = gesture.map((data) => ({
		t: data.timestamp,
		x: data.point.x,
		y: data.point.y,
	}));

	// Return undefined if gesture is too short
	const elapsed = touchPoints[touchPoints.length - 1].t - touchPoints[0].t;
	if (elapsed < CLASSIFICATION_INTERVAL && !touchup) {
		return "undefined";
	}
	if (touchPoints.length === 0) {
		return "undefined";
	}

	// Cut off at CLASSIFICATION_INTERVAL
	const cutOffTouchPoints = touchPoints.filter(
		(p) => p.t - touchPoints[0].t <= CLASSIFICATION_INTERVAL,
	);
	const maxT = Math.max(...touchPoints.map((g) => g.t));
	const extractedFeatures = extractFeatures(cutOffTouchPoints, maxT);

	// Match the order of feature_keys in main3.py
	const featureKeys: (keyof Features)[] = [
		"final_vel",
		"vel_std",
		"initial_distance",
		"vel_cv",
		"deceleration_ratio",
		"jerk_kurtosis",
		"jerk_max",
		"acc_kurtosis",
		"done",
		"acc_skewness",
		"straightness",
		"time_to_peak_jerk_ratio",
		"final_distance",
	];

	// Return features in the same order as Python, filling NaN values with 0
	const featureArray = featureKeys.map((key) => {
		const value = extractedFeatures[key] ?? 0;
		return Number.isNaN(value) || !Number.isFinite(value) ? 0 : value;
	});

	const probabilities = score(featureArray);
	if (Math.abs(probabilities[0] - probabilities[1]) < 0.1) {
		return "undefined";
	}
	const predictedGesture =
		probabilities[0] > probabilities[1] ? "pointing" : "scroll";
	return predictedGesture;
};
