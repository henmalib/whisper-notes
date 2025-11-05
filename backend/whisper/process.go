package whisper

import (
	"fmt"
	"strings"

	whisperCpp "github.com/ggerganov/whisper.cpp/bindings/go/pkg/whisper"
)

func (w *Whisper) loadModel(modelname string) (whisperCpp.Model, error) {
	modelPath := w.getModelPath(modelname)
	isInstalled, e := w.IsModelInstalled(modelname)

	if !isInstalled || e != nil {
		fmt.Println(e)
		return nil, fmt.Errorf("Model %s is not installed", modelname)
	}

	model, err := whisperCpp.New(modelPath)
	if err != nil {
		return nil, fmt.Errorf("Unable to load whisper model %s: %w", modelname, err)
	}

	return model, nil
}

func (w *Whisper) Process(modelname string, data []float32, lang string, processCallback func(int)) (transcibedResult string, processErr error) {
	defer func() {
		if r := recover(); r != nil {
			if e, ok := r.(error); ok {
				processErr = e
			} else {
				processErr = fmt.Errorf("panic: %v", r)
			}
		}
	}()

	model, err := w.loadModel(modelname)

	if err != nil {
		return "", err
	}

	defer model.Close()

	// WAV with 1 channel and model and SampleRate of whisperCpp.SampleRate

	modelContext, err := model.NewContext()
	if err != nil {
		return "", fmt.Errorf("Unable to create model context: %w", err)
	}

	modelContext.SetTranslate(false)
	modelContext.SetLanguage(lang)

	modelContext.SetBeamSize(3)
	modelContext.SetTemperature(0)

	var sb strings.Builder

	if err = modelContext.Process(data, nil, func(s whisperCpp.Segment) {
		sb.WriteString(s.Text)
	}, processCallback); err != nil {
		return "", fmt.Errorf("Unable to process audio file: %w", err)
	}

	return sb.String(), nil
}

func (w *Whisper) GetModelLanguages(modelname string) ([]string, error) {
	var langs []string

	model, err := w.loadModel(modelname)
	if err != nil {
		return langs, err
	}
	defer model.Close()

	return model.Languages(), nil
}
