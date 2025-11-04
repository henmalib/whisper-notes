package notes

import (
	"context"
	"fmt"
	"os"

	"github.com/henmalib/whisper-notes/backend/config"
)

type Notes struct {
	cfg config.ConfigHelper
	ctx context.Context
}

func NewNotes(ctx context.Context, cfg config.ConfigHelper) *Notes {
	return &Notes{
		ctx: ctx,
		cfg: cfg,
	}
}

type NoteInfo struct {
	Filename   string `json:"filename"`
	ModifyDate int64  `json:"ModifyDate"`
	Size       int64  `json:"size"`
}

func (n *Notes) GetNoteData() {}
func (n *Notes) GetNoteInfo() {}

func (n *Notes) ListNotes() ([]NoteInfo, error) {
	notes := []NoteInfo{}

	fmt.Println(n.cfg.GetConfig())

	if err := os.MkdirAll(n.cfg.GetConfig().NotesPath, os.ModePerm); err != nil {
		return notes, fmt.Errorf("Couldn't create notes directory: %w", err)
	}

	files, err := os.ReadDir(n.cfg.GetConfig().NotesPath)
	if err != nil {
		return notes, fmt.Errorf("Couldn't read notes dir: %w", err)
	}

	for _, file := range files {
		if file.IsDir() {
			// TODO: what should we do with erorrs here?
			info, err := file.Info()

			if err != nil {
				fmt.Println("Error while getting note info: %w", err)
				continue
			}

			notes = append(notes, NoteInfo{
				Filename:   info.Name(),
				Size:       info.Size(),
				ModifyDate: info.ModTime().UnixMilli(),
			})
		}
	}

	return notes, nil
}
func (n *Notes) DelteNote() {}
func (n *Notes) EditNote()  {}
