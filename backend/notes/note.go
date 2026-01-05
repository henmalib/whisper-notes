package notes

import (
	"encoding/json"
	"fmt"
	"os"
	"path"
	"strings"
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

func (n *NoteInfo) ReadData() (string, error) {
	// TODO: read actuall data
	return "# Header", nil
}

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

type AudioFile struct {
	AudioPath string `json:"audioPath"`
	Text      string `json:"text"`
}

func (n *NoteInfo) ListAudio() ([]AudioFile, error) {
	audios := []AudioFile{}
	notePath := n.getPath()

	files, err := os.ReadDir(notePath)
	if err != nil {
		return audios, err
	}

	for _, file := range files {
		filename := file.Name()
		if strings.HasSuffix(filename, ".wav") {
			text, err := os.ReadFile(path.Join(notePath, strings.Replace(filename, ".wav", ".txt", 1)))

			if err != nil {
				fmt.Println("Error while getting text audio", err)
				continue
			}

			audios = append(audios, AudioFile{
				AudioPath: path.Join(notePath, filename),
				Text:      string(text),
			})
		}
	}

	return audios, nil
}

func (n *NoteInfo) ChangeContent(content string) error { return nil }
