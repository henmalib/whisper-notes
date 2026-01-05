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

func updateNoteMeta(noteId string, meta *Metadata) error {
	notePath := getNotePath(noteId)

	// TODO: instead of json, use frontmatter of .md
	file, err := os.OpenFile(path.Join(notePath, "_metadata.json"), os.O_RDWR|os.O_CREATE, 0700)

	if err != nil {
		return fmt.Errorf("Coudn't create metadata file: %w", err)
	}

	defer file.Close()

	metadataBytes, err := json.Marshal(meta)
	if err != nil {
		return fmt.Errorf("Invalid metadata format: %w", err)
	}

	_, err = file.Write(metadataBytes)
	if err != nil {
		return fmt.Errorf("Coudn't write metadata file: %w", err)
	}

	return nil
}

func updateNoteData(noteId, data string) error {
	notePath := getNotePath(noteId)
	file, err := os.OpenFile(path.Join(notePath, "note.md"), os.O_RDWR|os.O_CREATE, 0700)

	if err != nil {
		return fmt.Errorf("Failed to create note file: %w", err)
	}

	defer file.Close()

	_, err = file.WriteString(data)
	if err != nil {
		return fmt.Errorf("Failed to write note file: %w", err)
	}

	return nil
}

func (n *Notes) CreateNote(title string) (string, error) {
	noteId := uuid.New().String()
	notePath := getNotePath(noteId)

	if err := os.MkdirAll(notePath, 0755); err != nil {
		return noteId, err
	}

	err := updateNoteMeta(noteId, &Metadata{
		Title: "Untitled",
	})

	return noteId, err
}

func getNotePath(noteId string) string {
	return path.Join(os.ExpandEnv(viper.GetString("NotesPath")), noteId)
}

func UpdateNote(noteId string, text string, meta *Metadata) error {
	if err := updateNoteMeta(noteId, meta); err != nil {
		return err
	}

	if err := updateNoteData(noteId, text); err != nil {
		return err
	}

	return nil
}
