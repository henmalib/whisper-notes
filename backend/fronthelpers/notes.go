package fronthelpers

import (
	"encoding/base64"
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
