package main

import (
	"context"
	"fmt"

	"github.com/henmalib/whisper-notes/backend/audio"
	"github.com/henmalib/whisper-notes/backend/config"
	"github.com/henmalib/whisper-notes/backend/notes"
	"github.com/henmalib/whisper-notes/backend/whisper"
)

type App struct {
	ctx     context.Context
	Whisper whisper.Whisper
	Audio   audio.Audio
	Notes   notes.Notes
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	configHelper := config.ConfigHelper{
		Appname: "notes",
	}

	if err := configHelper.LoadConfig(); err != nil {
		fmt.Printf("Error while reading config file: %s", err)
	}

	a.ctx = ctx
	a.Whisper = whisper.NewWhisper(ctx, configHelper)
	a.Audio = audio.NewAudio()
	a.Notes = *notes.NewNotes(ctx, configHelper)
}

func (a *App) Echo(str string) string {
	return str
}
