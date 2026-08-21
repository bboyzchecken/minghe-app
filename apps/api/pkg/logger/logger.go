package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

var log = logrus.New()

// Setup ตั้งค่า logger กลาง — production ใช้ JSON เพื่อให้ log aggregator อ่านได้
func Setup(environment string) {
	log.SetOutput(os.Stdout)

	if environment == "production" {
		log.SetFormatter(&logrus.JSONFormatter{TimestampFormat: "2006-01-02T15:04:05Z07:00"})
		log.SetLevel(logrus.InfoLevel)
		return
	}

	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "15:04:05",
	})
	log.SetLevel(logrus.DebugLevel)
}

func Log() *logrus.Logger { return log }

func Info(args ...any)  { log.Info(args...) }
func Warn(args ...any)  { log.Warn(args...) }
func Error(args ...any) { log.Error(args...) }
func Debug(args ...any) { log.Debug(args...) }

func WithFields(fields logrus.Fields) *logrus.Entry { return log.WithFields(fields) }
