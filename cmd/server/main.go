package main

import (
	"log"
	"os"
	"github.com/joho/godotenv"
	"meowcrm/internal/api"
	"meowcrm/internal/wa"
)

func main() {
	_ = godotenv.Load()
	dsn := os.Getenv("SQLITE_DSN")
	if dsn == "" { dsn = "file:wa.db?_foreign_keys=on" }

	wam, err := wa.NewManager(dsn)
	if err != nil { log.Fatal(err) }

	hub := api.NewHub()
	wam.RegisterHandlers(func(ev any){ hub.Broadcast(ev) })

	srv := api.NewServer(wam, hub)
	r := srv.Routes()

	addr := os.Getenv("ADDR")
	if addr == "" { addr = ":8080" }
	log.Println("API listening on", addr)
	if err := r.Run(addr); err != nil { log.Fatal(err) }
}
