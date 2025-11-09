package main

import (
	"log"
	"net/http"

	"backend/internal/database"
	"backend/internal/handlers"
)

func main() {
	// Init db
	db, err := database.InitDB("./sommerlan.db")
	if err != nil {
		log.Fatal("Failed to initialise database:", err)
	}

	log.Println("Connected to database")

	defer db.Close()

	h := handlers.NewHandlers(db)

	router := http.NewServeMux()
	router.HandleFunc("GET /api/health", handlers.EnableCORS(h.HealthHandler))
	router.HandleFunc("GET /api/lan", handlers.EnableCORS(h.LanHandler))
	router.HandleFunc("GET /api/lan/{id}", handlers.EnableCORS(h.LanHandlerById))

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
