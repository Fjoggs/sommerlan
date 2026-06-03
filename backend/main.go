package main

import (
	"log"
	"net/http"
	"os"

	"backend/internal/database"
	"backend/internal/handlers"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	dbPath := envOr("DB_PATH", "./sommerlan.db")
	frontendPath := envOr("FRONTEND_PATH", "../frontend")

	db, err := database.InitDB(dbPath)
	if err != nil {
		log.Fatal("Failed to initialise database:", err)
	}

	log.Println("Connected to database")

	defer db.Close()

	gateTime := handlers.ComputeLanGateTime(db)
	if !gateTime.IsZero() {
		log.Printf("Site gate opens at %s", gateTime.Format("2006-01-02 15:04:05"))
	}

	lan := handlers.NewLanHandlers(db, frontendPath)
	game := handlers.NewGameHandlers(db)
	award := handlers.NewAwardHandlers(db)
	user := handlers.NewUserHandlers(db)
	rsvp := handlers.NewRsvpHandlers(db)
	auth := handlers.NewAuthHandlers(db)

	router := http.NewServeMux()
	router.HandleFunc("GET /api/health/", handlers.EnableCORS(handlers.HealthHandler))
	router.HandleFunc("GET /api/countdown/", handlers.EnableCORS(handlers.CountdownHandler(gateTime)))

	// Auth routes
	router.HandleFunc("GET /api/auth/discord/", auth.DiscordLogin)
	router.HandleFunc("GET /api/auth/discord/callback/", auth.DiscordCallback)
	router.HandleFunc("GET /api/auth/me/", handlers.EnableCORS(auth.Me))
	router.HandleFunc("POST /api/auth/logout/", handlers.EnableCORS(auth.Logout))
	router.HandleFunc("PATCH /api/auth/me/", handlers.EnableCORS(auth.UpdateMe))
	router.HandleFunc("POST /api/admin/impersonate/{userId}/", handlers.EnableCORS(auth.Impersonate))
	router.HandleFunc("POST /api/admin/impersonate/stop/", handlers.EnableCORS(auth.StopImpersonate))
	router.HandleFunc("OPTIONS /api/admin/impersonate/{userId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/admin/impersonate/stop/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/auth/me/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/auth/logout/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// RSVP routes (scoped to a LAN)
	router.HandleFunc("GET /api/lan/{id}/rsvp/", handlers.EnableCORS(rsvp.GetRsvps))
	router.HandleFunc("POST /api/lan/{id}/rsvp/", handlers.EnableCORS(rsvp.AddRsvp))
	router.HandleFunc("DELETE /api/lan/{id}/rsvp/", handlers.EnableCORS(rsvp.DeleteRsvp))
	router.HandleFunc("OPTIONS /api/lan/{id}/rsvp/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

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
	router.HandleFunc("PATCH /api/lan/{id}/participant/{userId}/nickname/", handlers.EnableCORS(lan.SetParticipantNickname))
	router.HandleFunc(
		"OPTIONS /api/lan/{id}/participant/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}),
	)
	router.HandleFunc("OPTIONS /api/lan/{id}/participant/{userId}/nickname/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("POST /api/lan/{id}/attend/", handlers.EnableCORS(lan.AttendLan))
	router.HandleFunc("DELETE /api/lan/{id}/attend/", handlers.EnableCORS(lan.UnattendLan))
	router.HandleFunc(
		"OPTIONS /api/lan/{id}/attend/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}),
	)
	router.HandleFunc("POST /api/lan/{id}/games/", handlers.EnableCORS(lan.AddGameToLan))
	router.HandleFunc("OPTIONS /api/lan/{id}/games/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("GET /api/lan/{id}/images/", handlers.EnableCORS(lan.GetLanImages))
	router.HandleFunc("POST /api/lan/{id}/images/", handlers.EnableCORS(lan.UploadLanImage))
	router.HandleFunc("DELETE /api/lan/{id}/images/{imageId}/", handlers.EnableCORS(lan.DeleteLanImage))
	router.HandleFunc("PUT /api/lan/{id}/images/order/", handlers.EnableCORS(lan.ReorderLanImages))
	router.HandleFunc("POST /api/lan/{id}/images/{imageId}/tags/", handlers.EnableCORS(lan.AddImageTag))
	router.HandleFunc("DELETE /api/lan/{id}/images/{imageId}/tags/{tagId}/", handlers.EnableCORS(lan.RemoveImageTag))
	router.HandleFunc("GET /api/tags/", handlers.EnableCORS(lan.GetTags))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/{imageId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/order/{$}", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/{imageId}/tags/{$}", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/images/{imageId}/tags/{tagId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/tags/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// Quote routes
	router.HandleFunc("GET /api/lan/{id}/quotes/", handlers.EnableCORS(lan.GetLanQuotes))
	router.HandleFunc("POST /api/lan/{id}/quotes/", handlers.EnableCORS(lan.AddLanQuote))
	router.HandleFunc("DELETE /api/lan/{id}/quotes/{quoteId}/", handlers.EnableCORS(lan.DeleteLanQuote))
	router.HandleFunc("PATCH /api/lan/{id}/quotes/{quoteId}/", handlers.EnableCORS(lan.PatchLanQuote))
	router.HandleFunc("OPTIONS /api/lan/{id}/quotes/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/quotes/{quoteId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// Guest routes
	router.HandleFunc("GET /api/lan/{id}/guests/", handlers.EnableCORS(lan.GetLanGuests))
	router.HandleFunc("POST /api/lan/{id}/guests/", handlers.EnableCORS(lan.AddLanGuest))
	router.HandleFunc("DELETE /api/lan/{id}/guests/{guestId}/", handlers.EnableCORS(lan.DeleteLanGuest))
	router.HandleFunc("OPTIONS /api/lan/{id}/guests/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/lan/{id}/guests/{guestId}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// Game routes
	router.HandleFunc("GET /api/game/stats/", handlers.EnableCORS(game.GetGameStats))
	router.HandleFunc("GET /api/game/", handlers.EnableCORS(game.GetGames))
	router.HandleFunc("PATCH /api/game/", handlers.EnableCORS(game.AlterGame))
	router.HandleFunc("POST /api/game/", handlers.EnableCORS(game.AddGame))
	router.HandleFunc(
		"OPTIONS /api/game/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {
			// Empty handler - EnableCORS will handle the response
		}),
	)
	router.HandleFunc("GET /api/game/{id}/", handlers.EnableCORS(game.GetGameById))
	router.HandleFunc("DELETE /api/game/{id}/", handlers.EnableCORS(game.DeleteGameWithId))

	// Award routes
	router.HandleFunc("GET /api/award/", handlers.EnableCORS(award.GetAwards))
	router.HandleFunc("POST /api/award/", handlers.EnableCORS(award.AddAward))
	router.HandleFunc("DELETE /api/award/{id}/", handlers.EnableCORS(award.DeleteAwardWithId))
	router.HandleFunc("OPTIONS /api/award/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))
	router.HandleFunc("OPTIONS /api/award/{id}/", handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}))

	// User routes
	router.HandleFunc("GET /api/user/stats/", handlers.EnableCORS(user.GetUserStats))
	router.HandleFunc("GET /api/user/", handlers.EnableCORS(user.GetUsers))
	router.HandleFunc("POST /api/user/", handlers.EnableCORS(user.AddUser))
	router.HandleFunc("PATCH /api/user/", handlers.EnableCORS(user.AlterUser))
	router.HandleFunc("GET /api/user/{id}/", handlers.EnableCORS(user.GetUserById))
	router.HandleFunc(
		"OPTIONS /api/user/{id}/",
		handlers.EnableCORS(func(w http.ResponseWriter, r *http.Request) {}),
	)
	router.HandleFunc("DELETE /api/user/{id}/", handlers.EnableCORS(user.DeleteUserWithId))

	// Return [] for missing tweet files rather than 404ing
	router.HandleFunc("GET /data/tweets/", func(w http.ResponseWriter, r *http.Request) {
		p := frontendPath + r.URL.Path
		data, err := os.ReadFile(p)
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			w.Write([]byte("[]"))
			return
		}
		w.Write(data)
	})

	// Serve frontend static files (catch-all, must be registered last)
	router.Handle("/", handlers.NoCacheMiddleware(handlers.LanGateMiddleware(db, gateTime, handlers.CleanURLHandler(http.FileServer(http.Dir(frontendPath))))))

	addr := ":" + envOr("PORT", "3000")
	log.Println("Server listening on", addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
