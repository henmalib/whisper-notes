package audio

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math"

	"github.com/gen2brain/malgo"
	whisperCpp "github.com/ggerganov/whisper.cpp/bindings/go/pkg/whisper"
)

type Audio struct {
	deviceUsed    *malgo.Device
	deviceInfo    *malgo.DeviceInfo
	deviceContext *malgo.AllocatedContext
	currentBuffer []byte
}

func NewAudio() Audio {
	return Audio{}

}

type MicDeviceInfo struct {
	Name          string         `json:"name"`
	IsDefault     uint32         `json:"isDefault"`
	DeviceId      string         `json:"deviceId"`
	DeviceIdBytes malgo.DeviceID `json:"deviceIdBytes"`
}

func getMalgoDevices() ([]malgo.DeviceInfo, error) {
	context, err := malgo.InitContext(nil, malgo.ContextConfig{}, nil)
	defer func() {
		_ = context.Uninit()
		context.Free()
	}()

	if err != nil {
		return nil, fmt.Errorf("Error while initialising malgo context: %w", err)
	}

	malgoInfos, err := context.Devices(malgo.Capture)
	if err != nil {
		return nil, fmt.Errorf("Error while getting malgo devices: %w", err)
	}

	return malgoInfos, nil
}

func (a *Audio) GetAudioDevices() ([]MicDeviceInfo, error) {
	malgoInfo, err := getMalgoDevices()
	if err != nil {
		return nil, err
	}

	var infos []MicDeviceInfo

	for _, info := range malgoInfo {
		newInfo := MicDeviceInfo{
			Name:          info.Name(),
			IsDefault:     info.IsDefault,
			DeviceId:      info.ID.String(),
			DeviceIdBytes: info.ID,
		}

		infos = append(infos, newInfo)
	}

	return infos, nil
}

func (a *Audio) CaptureAudio(deviceId string) error {
	ctx, err := malgo.InitContext(nil, malgo.ContextConfig{}, nil)
	if err != nil {
		return fmt.Errorf("Error while initialising malgo context: %w", err)
	}
	a.deviceContext = ctx

	deviceList, err := getMalgoDevices()
	if err != nil {
		return fmt.Errorf("Couldn't get divice list: %w", err)
	}

	a.deviceInfo = nil
	for _, device := range deviceList {
		if device.ID.String() == deviceId {
			a.deviceInfo = &device
			break
		}
	}

	deviceConfig := malgo.DefaultDeviceConfig(malgo.Capture)
	deviceConfig.Capture.Format = malgo.FormatF32
	deviceConfig.Capture.Channels = 1
	deviceConfig.SampleRate = whisperCpp.SampleRate
	deviceConfig.Alsa.NoMMap = 1
	if a.deviceInfo != nil {
		deviceConfig.Capture.DeviceID = a.deviceInfo.ID.Pointer()
	}

	a.currentBuffer = make([]byte, 0)

	sizeInBytes := uint32(malgo.SampleSizeInBytes(deviceConfig.Capture.Format))
	var capturedSampleCount uint32

	onRecvFrames := func(pSample2, pSample []byte, framecount uint32) {
		sampleCount := framecount * deviceConfig.Capture.Channels * sizeInBytes
		newCapturedSampleCount := capturedSampleCount + sampleCount
		a.currentBuffer = append(a.currentBuffer, pSample...)
		capturedSampleCount = newCapturedSampleCount
	}

	captureCallbacks := malgo.DeviceCallbacks{
		Data: onRecvFrames,
	}

	device, err := malgo.InitDevice(ctx.Context, deviceConfig, captureCallbacks)

	if err != nil {
		fmt.Println(err)
		return fmt.Errorf("Error while initialising a malgo device %w", err)
	}

	err = device.Start()
	if err != nil {
		fmt.Println(2)
		return fmt.Errorf("Couldn't record an audio: %w", err)
	}

	a.deviceUsed = device
	return nil
}

func bytesToFloat32LE(b []byte) []float32 {
	n := len(b) / 4
	out := make([]float32, n)
	for i := range n {
		u := binary.LittleEndian.Uint32(b[i*4:])
		out[i] = math.Float32frombits(u)
	}
	return out
}

func (a *Audio) StopCapturing() []float32 {
	if a.deviceUsed != nil {
		a.deviceUsed.Uninit()
	}

	if a.deviceContext != nil {
		err := a.deviceContext.Uninit()

		if err != nil {
			fmt.Println(err)
		}

		a.deviceContext.Free()
	}

	bytes := a.currentBuffer
	a.deviceContext = nil
	a.currentBuffer = nil
	a.deviceUsed = nil
	a.deviceInfo = nil

	return bytesToFloat32LE(bytes)
}

func Float32ToWavBytes(data []float32) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("No audio data provided")
	}

	sampleRate := whisperCpp.SampleRate
	numSamples := len(data)

	var buf bytes.Buffer

	byteRate := sampleRate * 2
	blockAlign := 2

	// --- WAV Header (44 bytes) ---
	// ChunkID "RIFF"
	buf.WriteString("RIFF")
	binary.Write(&buf, binary.LittleEndian, uint32(36+numSamples*2))
	buf.WriteString("WAVE")

	// Subchunk1ID "fmt "
	buf.WriteString("fmt ")
	binary.Write(&buf, binary.LittleEndian, uint32(16)) // Subchunk1Size
	binary.Write(&buf, binary.LittleEndian, uint16(1))  // PCM
	binary.Write(&buf, binary.LittleEndian, uint16(1))  // Mono
	binary.Write(&buf, binary.LittleEndian, uint32(sampleRate))
	binary.Write(&buf, binary.LittleEndian, uint32(byteRate))
	binary.Write(&buf, binary.LittleEndian, uint16(blockAlign))
	binary.Write(&buf, binary.LittleEndian, uint16(16)) // BitsPerSample

	// Subchunk2ID "data"
	buf.WriteString("data")
	binary.Write(&buf, binary.LittleEndian, uint32(numSamples*2))

	// --- Samples ---
	for _, v := range data {
		// Clamp and convert to int16
		if v > 1.0 {
			v = 1.0
		} else if v < -1.0 {
			v = -1.0
		}
		sample := int16(math.Round(float64(v) * 32767))
		binary.Write(&buf, binary.LittleEndian, sample)
	}

	return buf.Bytes(), nil
}
