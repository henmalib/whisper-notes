package whisper

import (
	"fmt"
	"strings"

	whisperCpp "github.com/ggerganov/whisper.cpp/bindings/go/pkg/whisper"
)

func (w *Whisper) Process(modelname string, data []float32) (string, error) {
	modelPath, err := w.getModelPath(modelname)

	if err != nil {
		return "", fmt.Errorf("Unable to getModelPath %s: %w", modelname, err)
	}

	model, err := whisperCpp.New(modelPath)
	if err != nil {
		return "", fmt.Errorf("Unable to load whisper model %s: %w", modelname, err)
	}

	defer model.Close()

	fmt.Println("IsMultilingual", model.IsMultilingual())

	// WAV with 1 channel and model and SampleRate of whisperCpp.SampleRate

	modelContext, err := model.NewContext()
	if err != nil {
		return "", fmt.Errorf("Unable to create model context: %w", err)
	}

	if modelContext.IsMultilingual() {
		modelContext.SetLanguage("auto")
	}

	var sb strings.Builder

	// TODO: take a look at the callbacks
	if err = modelContext.Process(data, nil, func(s whisperCpp.Segment) {
		sb.WriteString(s.Text)
	}, nil); err != nil {
		return "", fmt.Errorf("Unable to process audio file: %w", err)
	}

	return sb.String(), nil
}
