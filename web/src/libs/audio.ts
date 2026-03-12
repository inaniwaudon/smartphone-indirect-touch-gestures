export const audioContext = new AudioContext({
	latencyHint: "interactive",
});

export const playSuccessBeep = async () => {
	if (audioContext.state === "suspended") {
		await audioContext.resume();
	}
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	// Configure buzzer sound
	oscillator.type = "square";
	// 800 Hz
	oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

	// Configure gain (fade out)
	gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
	gainNode.gain.exponentialRampToValueAtTime(
		0.01,
		audioContext.currentTime + 0.1,
	);

	// Play
	oscillator.start(audioContext.currentTime);
	oscillator.stop(audioContext.currentTime + 0.1);
};
