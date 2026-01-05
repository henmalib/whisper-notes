package fronthelpers

import (
	"encoding/base64"
	"errors"
	"fmt"
	"os"

	"github.com/henmalib/whisper-notes/backend/notes"
)

func (h *FrontHelpers) GetNoteMetadata(n *notes.NoteInfo) (*notes.Metadata, error) {
	return n.ReadMetadata()
}

func (h *FrontHelpers) GetNoteAudios(n *notes.NoteInfo) ([]notes.AudioFile, error) {
	files, err := n.ListAudio()

	if err != nil {
		return nil, err
	}

	for i, _ := range files {
		bytes, err := os.ReadFile(files[i].AudioPath)

		if err != nil {
			fmt.Printf("Couldn't read audio file at %s: %v\n", files[i].AudioPath, err)
			continue
		}
		files[i].AudioPath = "data:audio/wav;base64," + base64.StdEncoding.EncodeToString(bytes)
	}

	return files, nil
}

func (h *FrontHelpers) GetNoteText(n *notes.NoteInfo) (string, error) {
	data, err := n.ReadData()

	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}

		return "", err
	}

	return data, nil
}

func (h *FrontHelpers) SaveNote(id string, text string, metadata *notes.Metadata) error {
	return notes.UpdateNote(id, text, metadata)
}
