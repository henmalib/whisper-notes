package fronthelpers

import (
	"github.com/henmalib/whisper-notes/backend/notes"
)

func (h *FrontHelpers) GetNoteMetadata(n *notes.NoteInfo) (*notes.Metadata, error) {
	return n.ReadMetadata()
}
