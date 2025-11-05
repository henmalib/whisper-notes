package notes

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"time"
)

type NoteInfo struct {
	Id         string    `json:"id"`
	ModifyDate time.Time `json:"ModifyDate"`
	Size       int64     `json:"size"`
}

type Metadata struct {
	Title string `json:"title"`
}

func (n *NoteInfo) getPath() string {
	return getNotePath(n.Id)
}

func (n *NoteInfo) ReadData() string { return "" }
func (n *NoteInfo) ReadMetadata() (*Metadata, error) {
	path := path.Join(n.getPath(), "_metadata.json")

	bytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("Couldn't read note %s metadata: %w", n.Id, err)
	}

	var metadata Metadata
	err = json.Unmarshal(bytes, &metadata)

	return &metadata, err
}

func (n *NoteInfo) AddAudio(audioBytes []byte, text string) error {
	now := time.Now()

	if err := os.WriteFile(path.Join(n.getPath(), fmt.Sprintf("%d.wav", now.Unix())), audioBytes, 0600); err != nil {
		return err
	}

	return os.WriteFile(path.Join(n.getPath(), fmt.Sprintf("%d.txt", now.Unix())), []byte(text), 0600)
}
func (n *NoteInfo) ChangeContent(content string) error { return nil }
