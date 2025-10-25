package whisper

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/henmalib/whisper-notes/backend/config"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	srcUrl  = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
	srcExt  = ".bin"
	bufSize = 1024 * 64
)

var (
	modelNames = []string{
		"tiny", "tiny-q5_1", "tiny-q8_0",
		"tiny.en", "tiny.en-q5_1", "tiny.en-q8_0",
		"base", "base-q5_1", "base-q8_0",
		"base.en", "base.en-q5_1", "base.en-q8_0",
		"small", "small-q5_1", "small-q8_0",
		"small.en", "small.en-q5_1", "small.en-q8_0",
		"medium", "medium-q5_0", "medium-q8_0",
		"medium.en", "medium.en-q5_0", "medium.en-q8_0",
		"large-v1",
		"large-v2", "large-v2-q5_0", "large-v2-q8_0",
		"large-v3", "large-v3-q5_0",
		"large-v3-turbo", "large-v3-turbo-q5_0", "large-v3-turbo-q8_0",
	}
)

type Whisper struct {
	ctx    context.Context
	config *config.Config
}

func NewWhisper(ctx context.Context, config *config.Config) Whisper {
	return Whisper{
		ctx:    ctx,
		config: config,
	}
}

func (w *Whisper) GetModels() []string {
	return modelNames
}

func (w *Whisper) Download(model string) (string, error) {
	url, err := urlForModel(model)

	if err != nil {
		return "", fmt.Errorf("Couldn't resolve model url: %w", err)
	}

	return download(w.ctx, url, model, w.config.ModelPath)
}

func urlForModel(model string) (string, error) {
	if !strings.HasPrefix(model, "ggml-") {
		model = "ggml-" + model
	}

	if filepath.Ext(model) != srcExt {
		model += srcExt
	}

	url, err := url.Parse(srcUrl)
	if err != nil {
		return "", err
	}

	url.Path = fmt.Sprintf("%s/%s", strings.TrimSuffix(url.Path, "/"), model)
	return url.String(), nil
}

func download(ctx context.Context, modelUrl, modelname, out string) (string, error) {
	client := http.Client{}

	req, err := http.NewRequest("GET", modelUrl, nil)
	if err != nil {
		return "", err
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%s: %s", modelUrl, resp.Status)
	}

	path := os.ExpandEnv(filepath.Join(out, filepath.Base(modelUrl)))
	if info, err := os.Stat(path); err == nil && info.Size() == resp.ContentLength {
		return "", fmt.Errorf("Skipping %s as it already exists", modelUrl)
	}

	fmt.Println(path, out, modelUrl)

	dirPath := filepath.Dir(path)

	if err = os.MkdirAll(dirPath, 0755); err != nil {
		return "", fmt.Errorf("Error while creating models folder %s: %w", path, err)
	}

	w, err := os.Create(path)
	if err != nil {
		return "", fmt.Errorf("Error while creating a file %s: %w", path, err)
	}
	defer w.Close()

	data := make([]byte, bufSize)
	count := int64(0)
	ticker := time.NewTicker(5 * time.Second)

	for {
		select {
		case <-ctx.Done():
			return path, ctx.Err()
		case <-ticker.C:
			downloadReport(ctx, count, resp.ContentLength, modelname)
		default:
			n, err := resp.Body.Read(data)

			if err != nil {
				downloadReport(ctx, count, resp.ContentLength, modelname)
				return path, err
			} else if m, err := w.Write(data[:n]); err != nil {
				return path, err
			} else {
				count += int64(m)
			}
		}
	}
}

func downloadReport(ctx context.Context, count, total int64, modelName string) {
	percentage := int8(count * 100 / total)

	runtime.EventsEmit(ctx, fmt.Sprintf("whisper:download:%s", modelName), percentage)
}
