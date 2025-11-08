package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/spf13/viper"
)

var appname = "notes"

type Config struct {
	ModelPath    string `mapstructure:"ModelPath"`
	NotesPath    string `mapstructure:"NotesPath"`
	CurrentModel string `mapstructure:"CurrentModel"`

	MicrophoneId     string `mapstructure:"MicrophoneId"`
	PreferedLanguage string `mapstructure:"PreferedLanguage"`
}

type ConfigHelper struct {
	Appname string
}

type ConfigLoader interface {
	GetConfig() *Config
}

func init() {
	ModelPath := ""
	defaultModel := "large-v3-turbo"
	notesPath := ""

	switch runtime.GOOS {
	case "windows":
		ModelPath = os.Getenv("AppData") + "\\" + appname + "\\models"
		notesPath = os.Getenv("AppData") + "\\" + appname + "\\notes"
	case "darwin", "linux":
		ModelPath = "$HOME/.config/" + appname + "/models"
		notesPath = "$HOME/.config/" + appname + "/notes"
	}

	viper.Set("ModelPath", ModelPath)
	viper.Set("CurrentModel", defaultModel)
	viper.Set("PreferedLanguage", "en")

	// TODO: instead of default, always ask user first
	viper.Set("NotesPath", notesPath)
}

func (c ConfigHelper) LoadConfig() error {
	viper.SetConfigName(c.Appname)

	var cfgPath string
	switch runtime.GOOS {
	case "windows":
		cfgPath = os.Getenv("AppData") + "\\" + c.Appname
	case "darwin", "linux":
		cfgPath = "$HOME/.config/" + c.Appname
	}

	viper.AddConfigPath(cfgPath)

	if err := viper.ReadInConfig(); err != nil {
		cfgPath = filepath.Join(cfgPath, c.Appname+".json")

		fmt.Println("Creating default config at ", os.ExpandEnv(cfgPath))

		viper.WriteConfigAs(os.ExpandEnv(cfgPath))

		return err
	}

	return nil
}

func (c ConfigHelper) GetConfig() *Config {
	var cfg Config
	_ = viper.Unmarshal(&cfg)

	cfg.ModelPath = os.ExpandEnv(cfg.ModelPath)
	cfg.NotesPath = os.ExpandEnv(cfg.NotesPath)

	return &cfg
}

func (c ConfigHelper) UpdateConfig(field string, value any) error {
	viper.Set(field, value)

	return viper.WriteConfig()
}
