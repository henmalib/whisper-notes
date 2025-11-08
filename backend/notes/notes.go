package notes

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"sort"

	"github.com/google/uuid"
	"github.com/henmalib/whisper-notes/backend/config"
	"github.com/spf13/viper"
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

func (n *Notes) ListNotes() ([]NoteInfo, error) {
	notes := []NoteInfo{}

	if err := os.MkdirAll(n.cfg.GetConfig().NotesPath, 0755); err != nil {
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
				Id:         info.Name(),
				Size:       info.Size(),
				ModifyDate: info.ModTime(),
			})
		}
	}

	sort.Slice(notes, func(i, j int) bool {
		return notes[i].ModifyDate.Unix() > notes[j].ModifyDate.Unix()
	})

	return notes, nil
}
func (n *Notes) FindNote(id string) *NoteInfo {
	notePath := path.Join(n.cfg.GetConfig().NotesPath, id)

	stat, err := os.Stat(notePath)
	if err != nil {
		return nil
	}

	return &NoteInfo{
		Id:         id,
		Size:       stat.Size(),
		ModifyDate: stat.ModTime(),
	}
}

func (n *Notes) CreateNote(title string) (string, error) {
	noteId := uuid.New().String()
	notePath := path.Join(n.cfg.GetConfig().NotesPath, noteId)

	if err := os.MkdirAll(notePath, 0755); err != nil {
		return noteId, err
	}

	file, err := os.OpenFile(path.Join(notePath, "_metadata.json"), os.O_RDWR|os.O_CREATE, 0700)
	if err != nil {
		return noteId, fmt.Errorf("Coudn't create metadata file: %w", err)
	}

	defer file.Close()

	metadataBytes, err := json.Marshal(Metadata{
		Title: title,
	})

	if err != nil {
		return noteId, fmt.Errorf("Coudn't create metadata file: %w", err)
	}

	_, err = file.Write(metadataBytes)
	if err != nil {
		return noteId, fmt.Errorf("Coudn't write metadata file: %w", err)
	}

	return noteId, nil
}

func getNotePath(noteId string) string {
	return path.Join(os.ExpandEnv(viper.GetString("NotesPath")), noteId)
}
