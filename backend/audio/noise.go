package audio

import (
	"math"
	"sort"

	"github.com/mjibson/go-dsp/fft"
	"github.com/mjibson/go-dsp/window"
)

// DenoiseAudio applies spectral subtraction noise reduction using adaptive noise estimation.
// It finds the quietest segments throughout the recording to estimate noise profile.
// This approach is based on research from pyroomacoustics and standard DSP practices.
//
// Parameters:
//   - audio: input audio samples normalized to [-1, 1]
//   - sampleRate: sample rate of the audio (e.g., 44100)
//
// Returns: denoised audio samples
//
// Edge cases handled:
//   - Empty or very short audio (< fftSize samples)
//   - Audio with no quiet segments (uses minimum energy frames)
//   - Prevents over-subtraction artifacts via spectral floor
//   - Handles musical noise through alpha/beta parameters
func DenoiseAudio(audio []float32, sampleRate int) []float32 {
	const (
		fftSize  = 2048 // FFT window size (power of 2 for efficiency)
		hopSize  = 512  // Hop size (75% overlap for smooth reconstruction)
		alpha    = 3.0  // Over-subtraction exponent (higher = more aggressive)
		beta     = 20.0 // Noise over-estimation factor
		dbReduc  = 10.0 // Maximum reduction in dB
		lookback = 10   // Frames to look back for noise estimation
	)

	// Edge case: audio too short
	if len(audio) < fftSize {
		return audio // Return as-is if too short to process
	}

	// Calculate minimum gain based on max dB reduction
	gMin := math.Pow(10, -dbReduc/20.0)

	// Estimate noise using lookback approach (more robust than single quietest segment)
	noisePower := estimateNoisePowerLookback(audio, fftSize, hopSize, lookback)

	// Process audio in overlapping frames
	output := make([]float32, len(audio))
	windowFunc := window.Hamming(fftSize)
	numFrames := (len(audio) - fftSize) / hopSize

	// Track energy history for lookback
	powerHistory := make([][]float64, 0, numFrames)

	for frameIdx := 0; frameIdx < numFrames; frameIdx++ {
		start := frameIdx * hopSize
		end := start + fftSize

		if end > len(audio) {
			break
		}

		// Extract and window frame
		frame := make([]float64, fftSize)
		for i := 0; i < fftSize; i++ {
			frame[i] = float64(audio[start+i]) * windowFunc[i]
		}

		// FFT
		spectrum := fft.FFTReal(frame)

		// Compute power spectrum for this frame
		power := make([]float64, fftSize/2+1)
		for i := 0; i < len(power); i++ {
			real, imag := real(spectrum[i]), imag(spectrum[i])
			power[i] = real*real + imag*imag // Power = |X|^2
		}
		powerHistory = append(powerHistory, power)

		// Update noise estimate using lookback
		if len(powerHistory) > lookback {
			// Look back and find minimum power in recent history
			for k := 0; k < len(noisePower); k++ {
				minPower := powerHistory[frameIdx][k]
				for j := max(0, frameIdx-lookback); j <= frameIdx; j++ {
					if powerHistory[j][k] < minPower {
						minPower = powerHistory[j][k]
					}
				}
				noisePower[k] = minPower
			}
		}

		// Apply spectral subtraction with gain computation
		for i := 0; i < len(spectrum)/2+1; i++ {
			// Gain formula from pyroomacoustics:
			// G[k,n] = max{ ((P[k,n] - beta*P_N[k,n]) / P[k,n])^alpha, G_min }

			signalPower := power[i]
			if signalPower < 1e-10 {
				signalPower = 1e-10 // Prevent division by zero
			}

			// Calculate gain
			gain := (signalPower - beta*noisePower[i]) / signalPower
			if gain < 0 {
				gain = 0
			}
			gain = math.Pow(gain, alpha)

			// Apply minimum gain floor
			if gain < gMin {
				gain = gMin
			}

			// Apply gain to spectrum (magnitude only, preserve phase)
			spectrum[i] = complex(float64(gain)*real(spectrum[i]), float64(gain)*imag(spectrum[i]))
		}

		// Mirror spectrum for IFFT (conjugate symmetry)
		for i := 1; i < fftSize/2; i++ {
			spectrum[fftSize-i] = complex(real(spectrum[i]), -imag(spectrum[i]))
		}

		// Inverse FFT
		cleanFrame := fft.IFFT(spectrum)

		// Overlap-add with window compensation
		for i := 0; i < fftSize && start+i < len(output); i++ {
			output[start+i] += float32(real(cleanFrame[i]))
		}
	}

	// Normalize overlap-add result (compensate for window overlap)
	normalizeFactor := float32(fftSize) / float32(hopSize)
	for i := range output {
		output[i] /= normalizeFactor
	}

	return output
}

// estimateNoisePowerLookback estimates initial noise power spectrum using quietest frames.
// This provides a better starting point than using first N frames which might contain speech.
func estimateNoisePowerLookback(audio []float32, fftSize, hopSize, lookback int) []float64 {
	windowFunc := window.Hamming(fftSize)
	numFrames := (len(audio) - fftSize) / hopSize

	if numFrames < 1 {
		numFrames = 1
	}

	// Calculate power for each frame
	type frameInfo struct {
		index  int
		energy float64
		power  []float64
	}
	frames := make([]frameInfo, 0, numFrames)

	for frameIdx := 0; frameIdx < numFrames; frameIdx++ {
		start := frameIdx * hopSize
		end := start + fftSize
		if end > len(audio) {
			break
		}

		// Window and calculate total energy
		energy := 0.0
		frame := make([]float64, fftSize)
		for i := 0; i < fftSize; i++ {
			sample := float64(audio[start+i]) * windowFunc[i]
			frame[i] = sample
			energy += sample * sample
		}

		// FFT
		spectrum := fft.FFTReal(frame)

		// Calculate power spectrum
		power := make([]float64, fftSize/2+1)
		for i := 0; i < len(power); i++ {
			real, imag := real(spectrum[i]), imag(spectrum[i])
			power[i] = real*real + imag*imag
		}

		frames = append(frames, frameInfo{
			index:  frameIdx,
			energy: energy,
			power:  power,
		})
	}

	// Sort by energy to find quietest frames (likely noise-only regions)
	sort.Slice(frames, func(i, j int) bool {
		return frames[i].energy < frames[j].energy
	})

	// Use quietest frames for initial noise estimate
	// Use more frames if available for better estimate
	numNoiseFrames := max(1, min(len(frames)/10, lookback*2))

	// Average power spectrum from quietest frames
	avgPower := make([]float64, fftSize/2+1)
	for i := 0; i < numNoiseFrames; i++ {
		for j := 0; j < len(avgPower); j++ {
			avgPower[j] += frames[i].power[j]
		}
	}

	// Average and ensure non-zero values
	for i := range avgPower {
		avgPower[i] /= float64(numNoiseFrames)
		if avgPower[i] < 1e-10 {
			avgPower[i] = 1e-10 // Prevent division by zero later
		}
	}

	return avgPower
}

// Helper functions for min/max
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
