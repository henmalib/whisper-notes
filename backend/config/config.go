package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/spf13/viper"
)

type Config struct {
	ModelPath    string `mapstructure:"ModelPath"`
	NotesPath    string `mapstructure:"NotesPath"`
	CurrentModel string `mapstructure:"CurrentModel"`

	MicrophoneId string `mapstructure:"MicrophoneId"`
}

type ConfigHelper struct {
	Appname string
}

func getDefault(appname string) *Config {
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

	viper.SetDefault("ModelPath", ModelPath)
	viper.SetDefault("CurrentModel", defaultModel)

	// TODO: instead of default, always ask user first
	viper.SetDefault("NotesPath", notesPath)

	return &Config{
		CurrentModel: defaultModel,
		ModelPath:    ModelPath,
		NotesPath:    notesPath,
	}
}

func (c ConfigHelper) LoadConfig() error {
	viper.SetConfigName(c.Appname)
	getDefault(c.Appname)

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
	cfg := getDefault(c.Appname)

	// We just ignore the error and use default config if the format is somehow wrong
	_ = viper.Unmarshal(cfg)

	return cfg
}

func (c ConfigHelper) UpdateConfig(field string, value any) error {
	viper.Set(field, value)

	return viper.WriteConfig()
}
