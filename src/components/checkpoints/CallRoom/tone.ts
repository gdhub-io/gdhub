const TONE_HZ = 660;
const TONE_SECONDS = 0.6;

type SinkAudio = HTMLAudioElement & {
	setSinkId?: (id: string) => Promise<void>;
};

/** A short tone through the chosen speaker, where the browser lets us choose. */
export async function playTestTone(speakerId?: string) {
	const context = new AudioContext();
	const oscillator = context.createOscillator();
	const gain = context.createGain();
	const destination = context.createMediaStreamDestination();

	oscillator.frequency.value = TONE_HZ;
	gain.gain.setValueAtTime(0.2, context.currentTime);
	gain.gain.exponentialRampToValueAtTime(
		0.001,
		context.currentTime + TONE_SECONDS,
	);
	oscillator.connect(gain).connect(destination);

	const audio: SinkAudio = new Audio();
	audio.srcObject = destination.stream;
	if (speakerId && audio.setSinkId) await audio.setSinkId(speakerId);
	await audio.play();

	oscillator.start();
	oscillator.stop(context.currentTime + TONE_SECONDS);
	oscillator.onended = () => {
		audio.pause();
		void context.close();
	};
}
