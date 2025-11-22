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

	lan := handlers.NewLanHandlers(db)
	admin := handlers.NewAdminHandlers(db)

	router := http.NewServeMux()
	router.HandleFunc("GET /api/health/", handlers.EnableCORS(lan.HealthHandler))
	router.HandleFunc("GET /api/lan/", handlers.EnableCORS(lan.GetLan))
	router.HandleFunc("POST /api/lan/", handlers.EnableCORS(lan.AddLan))
	router.HandleFunc("GET /api/lan/{id}/", handlers.EnableCORS(lan.GetLanById))

	// Admin routes
	router.HandleFunc("GET /api/game/", handlers.EnableCORS(admin.GetGames))
	router.HandleFunc("POST /api/game/", handlers.EnableCORS(admin.AddGame))
	router.HandleFunc(
		"OPTIONS /api/game/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {
			// Empty handler - EnableCORS will handle the response
		}),
	)
	router.HandleFunc("DELETE /api/game/{id}/", handlers.EnableCORS(admin.DeleteGame))

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
