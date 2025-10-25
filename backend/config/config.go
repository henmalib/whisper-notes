package config

import (
	"fmt"
	"os"
	"runtime"

	"github.com/spf13/viper"
)

type Config struct {
	ModelPath    string `mapstructure:"modelPath"`
	CurrentModel string `mapstructure:"currentModel"`
}

func getDefault(appname string) *Config {
	ModelPath := ""

	switch runtime.GOOS {
	case "windows":
		ModelPath = os.Getenv("AppData") + "\\" + appname + "\\models"
	case "darwin", "linux":
		ModelPath = "$HOME/.config/" + appname + "/models"
	}

	return &Config{
		CurrentModel: "large-v3-turbo",
		ModelPath:    ModelPath,
	}
}

func LoadConfig(appname string) (*Config, error) {
	cfg := getDefault(appname)

	viper.SetConfigName(appname)
	viper.SetConfigType("json")

	switch runtime.GOOS {
	case "windows":
		viper.AddConfigPath(os.Getenv("AppData") + "\\" + appname)
	case "darwin", "linux":
		viper.AddConfigPath("$HOME/.config/" + appname)
	}
	viper.AddConfigPath(".")

	if err := viper.ReadInConfig(); err != nil {
		return cfg, nil
	}

	if err := viper.Unmarshal(cfg); err != nil {
		return cfg, fmt.Errorf("unmarshal config: %w", err)
	}

	return cfg, nil
}
