import type { VRM } from '@pixiv/three-vrm';
import type { TtsManager } from '../tts/manager.js';

export const PHONEME_TO_BLEND_SHAPE: Record<string, Record<string, number>> = {
	// Vowels
	'\u0259': { aa: 0.5, ih: 0.2 },
	'\u00e6': { aa: 0.7 },
	a: { aa: 0.8 },
	'\u0251': { aa: 1.0 },
	'\u0252': { oh: 0.8 },
	'\u0254': { oh: 1.0 },
	o: { oh: 0.9 },
	'\u028a': { ou: 0.7 },
	u: { ou: 1.0 },
	'\u028c': { aa: 0.5, oh: 0.3 },
	'\u026a': { ih: 0.6 },
	i: { ee: 0.8, ih: 0.3 },
	e: { ee: 0.7, ih: 0.2 },
	'\u025b': { ee: 0.6, ih: 0.3 },
	'\u025c': { aa: 0.5, oh: 0.3 },
	'\u0250': { aa: 0.6 },
	// Consonants
	f: { ih: 0.3 },
	v: { ih: 0.3 },
	'\u03b8': { ih: 0.4 },
	'\u00f0': { ih: 0.4 },
	s: { ih: 0.4 },
	z: { ee: 0.4 },
	'\u0283': { ou: 0.4 },
	'\u0292': { ou: 0.4 },
	t: { ih: 0.3 },
	d: { ih: 0.3 },
	n: { ih: 0.3 },
	l: { ih: 0.3 },
	'\u0279': { ou: 0.4 },
	w: { ou: 0.6 },
	j: { ee: 0.4 },
	p: { aa: 0.3 },
	b: { aa: 0.3 },
	m: { aa: 0.3 },
	k: { aa: 0.4 },
	'\u0261': { aa: 0.4 },
	'\u014b': { aa: 0.3 },
	h: { aa: 0.2 },
	'\u027e': { ih: 0.3 },
	't\u0283': { ou: 0.4 },
	'd\u0292': { ou: 0.4 }
};

let previousAa = 0;
let previousIh = 0;
let previousOu = 0;
let previousEe = 0;
let previousOh = 0;

// Cache cleaned phoneme arrays to avoid regex + split + filter every frame
const phonemeCache = new Map<string, string[]>();
function getCleanPhonemes(raw: string): string[] {
	let cached = phonemeCache.get(raw);
	if (!cached) {
		cached = raw
			.replace(/[\u02c8\u02cc\u02d0\u02d1\u032f\u0329\u0306\u0303\u0300\u0301\u0302\u0304]/g, '')
			.replace(/[,.!?]/g, '')
			.split('')
			.filter((c: string) => c.trim().length > 0);
		phonemeCache.set(raw, cached);
		if (phonemeCache.size > 500) {
			const first = phonemeCache.keys().next().value;
			if (first !== undefined) phonemeCache.delete(first);
		}
	}
	return cached;
}

export function updateLipSync(vrm: VRM | null, ttsManager: TtsManager) {
	if (!vrm || !vrm.expressionManager) return;

	const manager = vrm.expressionManager;
	const hasHtmlAudio = !!ttsManager.currentAudio;
	const isHtmlAudioActive = hasHtmlAudio
		? !ttsManager.currentAudio!.paused && !ttsManager.currentAudio!.ended
		: false;
	const isPlaybackActive = isHtmlAudioActive || ttsManager.isPlaying;

	if (!isPlaybackActive) {
		manager.setValue('aa', 0);
		manager.setValue('ih', 0);
		manager.setValue('ou', 0);
		manager.setValue('ee', 0);
		manager.setValue('oh', 0);
		previousAa = previousIh = previousOu = previousEe = previousOh = 0;
		return;
	}

	const audioAmplitude = ttsManager.getAudioAmplitude();
	const isAudioActive = audioAmplitude > 0.02;

	if (!isAudioActive) {
		manager.setValue('aa', 0);
		manager.setValue('ih', 0);
		manager.setValue('ou', 0);
		manager.setValue('ee', 0);
		manager.setValue('oh', 0);
		previousAa = previousIh = previousOu = previousEe = previousOh = 0;
		return;
	}

	const currentTime = isHtmlAudioActive
		? ttsManager.currentAudio!.currentTime
		: ttsManager.audioContext && ttsManager.wordBoundaryStartTime !== null
			? Math.max(0, ttsManager.audioContext.currentTime - ttsManager.wordBoundaryStartTime)
			: 0;
	let targetAa = 0,
		targetIh = 0,
		targetOu = 0,
		targetEe = 0,
		targetOh = 0;

	const hasValidTiming =
		ttsManager.wordBoundaries &&
		ttsManager.wordBoundaries.length > 1 &&
		ttsManager.wordBoundaries.some((wb, i) => {
			if (i === 0) return false;
			const prevOffset = ttsManager.wordBoundaries[i - 1].offset || 0;
			const currOffset = wb.offset || 0;
			return currOffset > prevOffset;
		});

	let currentWordBoundary: (typeof ttsManager.wordBoundaries)[0] | null = null;
	let wordIndex = -1;
	if (hasValidTiming) {
		for (let i = 0; i < ttsManager.wordBoundaries.length; i++) {
			const wb = ttsManager.wordBoundaries[i];
			const wordStart = (wb.offset || 0) / 10000000;
			const wordEnd = wordStart + (wb.duration || 0) / 10000000;
			if (currentTime >= wordStart && currentTime <= wordEnd) {
				currentWordBoundary = wb;
				wordIndex = i;
				break;
			}
		}
	}

	let usedPhonemeMode = false;

	// Phoneme mode (Kokoro — has word boundaries + phoneme data)
	if (hasValidTiming && currentWordBoundary && ttsManager.currentPhonemes) {
		let wordPhonemes = '';
		if (Array.isArray(ttsManager.currentPhonemes)) {
			if (wordIndex >= 0 && wordIndex < ttsManager.currentPhonemes.length) {
				wordPhonemes = ttsManager.currentPhonemes[wordIndex];
			}
		}

		if (wordPhonemes) {
			const wordStart = (currentWordBoundary.offset || 0) / 10000000;
			const wordDuration = (currentWordBoundary.duration || 0) / 10000000;
			const timeInWord = Math.max(0, Math.min(1, (currentTime - wordStart) / wordDuration));

			const cleanPhonemes = getCleanPhonemes(wordPhonemes);

			if (cleanPhonemes.length > 0) {
				const acceleratedTime = Math.min(timeInWord * 1.5, 1.0);
				const phonemeIndex = Math.floor(acceleratedTime * cleanPhonemes.length);
				const currentPhoneme = cleanPhonemes[phonemeIndex] || cleanPhonemes[cleanPhonemes.length - 1];

				let phonemeKey = currentPhoneme;
				if (phonemeIndex < cleanPhonemes.length - 1) {
					const twoChar = currentPhoneme + cleanPhonemes[phonemeIndex + 1];
					if (PHONEME_TO_BLEND_SHAPE.hasOwnProperty(twoChar)) {
						phonemeKey = twoChar;
					}
				}

				const blendMap = PHONEME_TO_BLEND_SHAPE[phonemeKey] || {};
				targetAa = blendMap.aa || 0;
				targetIh = blendMap.ih || 0;
				targetOu = blendMap.ou || 0;
				targetEe = blendMap.ee || 0;
				targetOh = blendMap.oh || 0;

				const hasMapping =
					targetAa > 0 || targetIh > 0 || targetOu > 0 || targetEe > 0 || targetOh > 0;

				if (hasMapping) {
					const effectiveAmplitude = Math.max(audioAmplitude, 0.3);
					const amplitudeMultiplier = Math.min(effectiveAmplitude * 2.0, 1.0);
					targetAa = Math.min(targetAa * amplitudeMultiplier + effectiveAmplitude * 0.5, 1.0);
					targetIh = Math.min(targetIh * amplitudeMultiplier + effectiveAmplitude * 0.3, 1.0);
					targetOu = Math.min(targetOu * amplitudeMultiplier + effectiveAmplitude * 0.3, 1.0);
					targetEe = Math.min(targetEe * amplitudeMultiplier + effectiveAmplitude * 0.3, 1.0);
					targetOh = Math.min(targetOh * amplitudeMultiplier + effectiveAmplitude * 0.3, 1.0);
					if (targetAa + targetIh + targetOu + targetEe + targetOh < 0.2) {
						targetAa = Math.max(targetAa, effectiveAmplitude * 0.5);
					}
					usedPhonemeMode = true;
				}
			}
		}
	}

	// Frequency-band viseme estimation (primary fallback — Fish Audio + any non-phoneme audio)
	// Maps FFT frequency bands to mouth shapes based on formant frequencies:
	//   Low band (0-860Hz)    → jaw open (aa/oh) — vocal fundamental + F1
	//   Mid-low (860-2150Hz)  → mid shapes (ih)  — F1-F2 transition
	//   Mid-high (2150-3440Hz)→ spread/round (ee/ou) — F2 region
	//   High (3440-6020Hz)    → fricatives (slight ih) — sibilance
	if (!usedPhonemeMode) {
		const bands = ttsManager.getFrequencyBands();

		if (bands) {
			const { low, midLow, midHigh, high } = bands;
			const total = low + midLow + midHigh + high;

			if (total > 0.05) {
				// Normalize bands relative to each other
				const nLow = low / total;
				const nMidLow = midLow / total;
				const nMidHigh = midHigh / total;
				const nHigh = high / total;

				// Map frequency distribution to visemes
				// aa: jaw open — dominated by low frequencies (open vowels like "ah", "aah")
				targetAa = Math.min(nLow * 1.4 * audioAmplitude * 2.0, 1.0);

				// oh: rounded lips — low + some mid (vowels like "oh", "oo")
				targetOh = Math.min((nLow * 0.5 + nMidLow * 0.5) * audioAmplitude * 1.6, 0.8);

				// ih: slight open — mid frequencies (vowels like "ih", "eh")
				targetIh = Math.min((nMidLow * 0.8 + nHigh * 0.4) * audioAmplitude * 1.6, 0.7);

				// ee: wide spread — high-mid frequencies (vowels like "ee", "ay")
				targetEe = Math.min(nMidHigh * 1.2 * audioAmplitude * 1.8, 0.7);

				// ou: rounded/pursed — mid balance (vowels like "oo", "ou")
				targetOu = Math.min((nMidHigh * 0.6 + nLow * 0.3) * audioAmplitude * 1.4, 0.6);

				// Ensure minimum mouth movement when audio is playing
				if (targetAa + targetIh + targetOu + targetEe + targetOh < 0.15) {
					targetAa = Math.max(audioAmplitude * 0.5, 0.15);
				}
			} else {
				// Very quiet — barely open
				targetAa = audioAmplitude * 0.3;
			}
		} else {
			// No frequency data available — simple amplitude-only fallback
			targetAa = audioAmplitude * 0.8;
			targetIh = audioAmplitude * 0.15;
		}
	}

	// Smooth transitions — higher value = smoother/slower mouth movement
	const smoothing = usedPhonemeMode ? 0.25 : 0.35;
	const smoothedAa = previousAa + (targetAa - previousAa) * (1 - smoothing);
	const smoothedIh = previousIh + (targetIh - previousIh) * (1 - smoothing);
	const smoothedOu = previousOu + (targetOu - previousOu) * (1 - smoothing);
	const smoothedEe = previousEe + (targetEe - previousEe) * (1 - smoothing);
	const smoothedOh = previousOh + (targetOh - previousOh) * (1 - smoothing);

	manager.setValue('aa', Math.min(Math.max(smoothedAa, 0), 1.0));
	manager.setValue('ih', Math.min(Math.max(smoothedIh, 0), 1.0));
	manager.setValue('ou', Math.min(Math.max(smoothedOu, 0), 1.0));
	manager.setValue('ee', Math.min(Math.max(smoothedEe, 0), 1.0));
	manager.setValue('oh', Math.min(Math.max(smoothedOh, 0), 1.0));

	previousAa = smoothedAa;
	previousIh = smoothedIh;
	previousOu = smoothedOu;
	previousEe = smoothedEe;
	previousOh = smoothedOh;
}

export function resetLipSync(vrm: VRM | null) {
	if (!vrm?.expressionManager) return;
	vrm.expressionManager.setValue('aa', 0);
	vrm.expressionManager.setValue('ih', 0);
	vrm.expressionManager.setValue('ou', 0);
	vrm.expressionManager.setValue('ee', 0);
	vrm.expressionManager.setValue('oh', 0);
	previousAa = previousIh = previousOu = previousEe = previousOh = 0;
}
