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
	game := handlers.NewGameHandlers(db)
	user := handlers.NewUserHandlers(db)
	rsvp := handlers.NewRsvpHandlers(db)
	auth := handlers.NewAuthHandlers(db)

	router := http.NewServeMux()
	router.HandleFunc("GET /api/health/", handlers.EnableCORS(handlers.HealthHandler))

	// Auth routes
	router.HandleFunc("GET /api/auth/discord/", auth.DiscordLogin)
	router.HandleFunc("GET /api/auth/discord/callback/", auth.DiscordCallback)
	router.HandleFunc("GET /api/auth/me/", handlers.EnableCORS(auth.Me))
	router.HandleFunc("POST /api/auth/logout/", handlers.EnableCORS(auth.Logout))
	router.HandleFunc("PATCH /api/auth/me/", handlers.EnableCORS(auth.UpdateMe))
	router.HandleFunc("OPTIONS /api/auth/me/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/auth/logout/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// RSVP routes
	router.HandleFunc("GET /api/rsvp/", handlers.EnableCORS(rsvp.GetRsvps))
	router.HandleFunc("POST /api/rsvp/", handlers.EnableCORS(rsvp.AddRsvp))
	router.HandleFunc("OPTIONS /api/rsvp/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// LAN routes
	router.HandleFunc("GET /api/lan/", handlers.EnableCORS(lan.GetLan))
	router.HandleFunc("POST /api/lan/", handlers.EnableCORS(lan.AddLan))
	router.HandleFunc("PATCH /api/lan/", handlers.EnableCORS(lan.AlterLan))
	router.HandleFunc("OPTIONS /api/lan/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("GET /api/lan/{id}/", handlers.EnableCORS(lan.GetLanById))
	router.HandleFunc(
		"OPTIONS /api/lan/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {
			// Empty handler - EnableCORS will handle the response
		}),
	)
	router.HandleFunc("DELETE /api/lan/{id}/", handlers.EnableCORS(lan.DeleteLanWithId))
	router.HandleFunc("POST /api/lan/{id}/participant/", handlers.EnableCORS(lan.AddParticipantToLan))
	router.HandleFunc(
		"OPTIONS /api/lan/{id}/participant/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}),
	)
	router.HandleFunc("POST /api/lan/{id}/attend/", handlers.EnableCORS(lan.AttendLan))
	router.HandleFunc("DELETE /api/lan/{id}/attend/", handlers.EnableCORS(lan.UnattendLan))
	router.HandleFunc(
		"OPTIONS /api/lan/{id}/attend/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}),
	)
	router.HandleFunc("GET /api/lan/{id}/images/", handlers.EnableCORS(lan.GetLanImages))
	router.HandleFunc("POST /api/lan/{id}/images/", handlers.EnableCORS(lan.UploadLanImage))
	router.HandleFunc("DELETE /api/lan/{id}/images/{imageId}/", handlers.EnableCORS(lan.DeleteLanImage))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/{imageId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// Game routes
	router.HandleFunc("GET /api/game/", handlers.EnableCORS(game.GetGames))
	router.HandleFunc("PATCH /api/game/", handlers.EnableCORS(user.AlterUser))
	router.HandleFunc("POST /api/game/", handlers.EnableCORS(game.AddGame))
	router.HandleFunc(
		"OPTIONS /api/game/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {
			// Empty handler - EnableCORS will handle the response
		}),
	)
	router.HandleFunc("DELETE /api/game/{id}/", handlers.EnableCORS(game.DeleteGameWithId))

	// User routes
	router.HandleFunc("GET /api/user/", handlers.EnableCORS(user.GetUsers))
	router.HandleFunc("POST /api/user/", handlers.EnableCORS(user.AddUser))
	router.HandleFunc("PATCH /api/user/", handlers.EnableCORS(user.AlterUser))
	router.HandleFunc(
		"OPTIONS /api/user/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {
			// Empty handler - EnableCORS will handle the response
		}),
	)
	router.HandleFunc("DELETE /api/user/{id}/", handlers.EnableCORS(user.DeleteUserWithId))

	// Serve frontend static files (catch-all, must be registered last)
	router.Handle("/", http.FileServer(http.Dir("../frontend")))

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
