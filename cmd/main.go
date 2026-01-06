package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"wppgo-bot/internal/bot"
	"wppgo-bot/internal/data"
)

func main() {
	log.Println("Iniciando a aplicação...")

	data.RunMigrations()

	db, err := data.NewDB()
	if err != nil {
		log.Fatalf("Erro ao conectar com o banco de dados: %v", err)
	}
	defer db.Close()

	data.CreateAdminUserIfNotExists(db)

	appBot := bot.NewBot()

	go func() {
		if err := appBot.Connect(); err != nil {
			log.Fatalf("Erro ao conectar o bot do WhatsApp: %v", err)
		}
	}()

	log.Println("Aplicação iniciada. Bot e servidor web estão rodando.")

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	appBot.Disconnect()
	log.Println("Aplicação encerrada.")
}
