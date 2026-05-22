package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"backend/internal/database"
)

const discordAuthURL = "https://discord.com/oauth2/authorize"
const discordAPI = "https://discord.com/api/v10"

type AuthHandlers struct {
	db           *sql.DB
	clientID     string
	clientSecret string
	redirectURI  string
	frontendURL  string
	guildID      string
}

func NewAuthHandlers(db *sql.DB) *AuthHandlers {
	clientID := os.Getenv("DISCORD_CLIENT_ID")
	clientSecret := os.Getenv("DISCORD_CLIENT_SECRET")
	redirectURI := os.Getenv("DISCORD_REDIRECT_URI")
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		log.Fatal("DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI must be set")
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:8080"
	}
	guildID := os.Getenv("DISCORD_GUILD_ID")
	if guildID == "" {
		log.Fatal("DISCORD_GUILD_ID must be set")
	}
	return &AuthHandlers{
		db:           db,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURI:  redirectURI,
		frontendURL:  frontendURL,
		guildID:      guildID,
	}
}

func (h *AuthHandlers) DiscordLogin(w http.ResponseWriter, r *http.Request) {
	params := url.Values{}
	params.Set("client_id", h.clientID)
	params.Set("redirect_uri", h.redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", "identify guilds")
	http.Redirect(w, r, discordAuthURL+"?"+params.Encode(), http.StatusFound)
}

func (h *AuthHandlers) DiscordCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := h.exchangeCode(code)
	if err != nil {
		log.Printf("exchangeCode: %v", err)
		http.Error(w, "auth failed", http.StatusInternalServerError)
		return
	}

	discordUser, err := h.getDiscordUser(accessToken)
	if err != nil {
		log.Printf("getDiscordUser: %v", err)
		http.Error(w, "auth failed", http.StatusInternalServerError)
		return
	}

	inGuild, err := h.isGuildMember(accessToken, h.guildID)
	if err != nil {
		log.Printf("isGuildMember: %v", err)
		http.Error(w, "auth failed", http.StatusInternalServerError)
		return
	}
	if !inGuild {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	user, err := database.UpsertDiscordUser(h.db, discordUser.GlobalName, discordUser.ID)
	if err != nil {
		log.Printf("UpsertDiscordUser: %v", err)
		http.Error(w, "auth failed", http.StatusInternalServerError)
		return
	}

	token, err := database.CreateSession(h.db, user.Id)
	if err != nil {
		log.Printf("CreateSession: %v", err)
		http.Error(w, "auth failed", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, h.frontendURL+"/login.html?token="+token, http.StatusFound)
}

func (h *AuthHandlers) Me(w http.ResponseWriter, r *http.Request) {
	user, err := GetUserFromRequest(h.db, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandlers) UpdateMe(w http.ResponseWriter, r *http.Request) {
	user, err := GetUserFromRequest(h.db, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Nickname string `json:"nickname"`
		Color    string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Color == "" {
		http.Error(w, "color required", http.StatusBadRequest)
		return
	}

	if err := database.SetNickname(h.db, user.Id, body.Nickname, body.Color); err != nil {
		log.Printf("UpdateMe: %v", err)
		http.Error(w, "failed to update", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(database.UserResponse{Id: user.Id, Name: user.Name, Nickname: body.Nickname, Color: body.Color})
}

func (h *AuthHandlers) Logout(w http.ResponseWriter, r *http.Request) {
	token := ExtractToken(r)
	if token != "" {
		_ = database.DeleteSession(h.db, token)
	}
	w.WriteHeader(http.StatusNoContent)
}

// ExtractToken reads the Bearer token from the Authorization header.
func ExtractToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(auth, "Bearer ")
}

// GetUserFromRequest validates the session token and returns the current user.
func GetUserFromRequest(db *sql.DB, r *http.Request) (*database.UserResponse, error) {
	token := ExtractToken(r)
	if token == "" {
		return nil, fmt.Errorf("no token")
	}
	return database.GetUserFromToken(db, token)
}

func (h *AuthHandlers) exchangeCode(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", h.clientID)
	data.Set("client_secret", h.clientSecret)
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", h.redirectURI)

	resp, err := http.PostForm(discordAPI+"/oauth2/token", data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("no access_token in response")
	}
	return result.AccessToken, nil
}

type discordUserInfo struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	GlobalName string `json:"global_name"`
}

func (h *AuthHandlers) isGuildMember(accessToken, guildID string) (bool, error) {
	req, err := http.NewRequest("GET", discordAPI+"/users/@me/guilds", nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var guilds []struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&guilds); err != nil {
		return false, err
	}
	for _, g := range guilds {
		if g.ID == guildID {
			return true, nil
		}
	}
	return false, nil
}

func (h *AuthHandlers) getDiscordUser(accessToken string) (*discordUserInfo, error) {
	req, err := http.NewRequest("GET", discordAPI+"/users/@me", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var user discordUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	if user.GlobalName == "" {
		user.GlobalName = user.Username
	}
	return &user, nil
}
