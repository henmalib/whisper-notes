package fronthelpers

import (
	"context"
	"fmt"

	"github.com/henmalib/whisper-notes/backend/config"
	"github.com/henmalib/whisper-notes/backend/notes"
	"github.com/henmalib/whisper-notes/backend/whisper"
)

type FrontHelpers struct {
	ctx         context.Context
	cfg         config.ConfigLoader
	whisper     *whisper.Whisper
	noteCreator NoteCreator
}

type NoteCreator interface {
	CreateNote(title string) (string, error)
	FindNote(id string) *notes.NoteInfo
}

func NewHelpers(ctx context.Context, cfg config.ConfigLoader, whisper *whisper.Whisper, notes NoteCreator) FrontHelpers {
	return FrontHelpers{
		ctx,
		cfg,
		whisper,
		notes,
	}
}

// I want to support uploading audio later on, so having data as an arg is useful!
func (h *FrontHelpers) ProcessAndSaveNote(data []float32, language, toastId string) error {
	// modelname := h.cfg.GetConfig().CurrentModel

	// text, err := h.whisper.Process(modelname, data, language, func(i int) {
	// 	runtime.EventsEmit(h.ctx, fmt.Sprintf("whisper:audio:%s:progress", toastId), i)
	// })

	// if err != nil {
	// 	return fmt.Errorf("Couldn't extract text from the audio: %w", err)
	// }

	// audioBytes, err := audio.Float32ToWavBytes(data)
	// if err != nil {
	// 	return fmt.Errorf("Couldn't convert audio to WAV: %w", err)
	// }
	//

	noteId, err := h.noteCreator.CreateNote("Unnamed")
	if err != nil {
		return fmt.Errorf("Couldn't create a note: %w", err)
	}

	note := h.noteCreator.FindNote(noteId)
	if note == nil {
		return fmt.Errorf("Newly created note wasn't found? NoteId: %s", noteId)
	}

	return nil
}
