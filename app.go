package main

import (
	"context"
	"fmt"

	"github.com/henmalib/whisper-notes/backend/config"
	"github.com/henmalib/whisper-notes/backend/whisper"

	whisperCpp "github.com/ggerganov/whisper.cpp/bindings/go/pkg/whisper"
)

type App struct {
	ctx     context.Context
	Config  *config.Config
	Whisper whisper.Whisper
}

func NewApp() *App {
	fmt.Println(whisperCpp.SampleRate)

	cfg, err := config.LoadConfig("notes")

	if err != nil {
		fmt.Printf("Error while reading config file: %s", err)
	}

	return &App{
		Config: cfg,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	a.Whisper = whisper.NewWhisper(ctx, a.Config)
}

func (a *App) Echo(str string) string {
	return str
}
