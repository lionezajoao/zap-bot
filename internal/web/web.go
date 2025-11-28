package web

import (
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"sync"
	"time"

	"wppgo-bot/internal/data"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

//go:embed templates/*
var templates embed.FS

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	sessionCookieName = "zapbot-session"
)

type BotConnector interface {
	GetIsConnected() bool
	Disconnect()
	GetLatestQRCode() (string, time.Time)
}

type WebServer struct {
	botConnector BotConnector
	mu           sync.Mutex
	clients      map[*websocket.Conn]bool
	db           *sql.DB
}

func NewWebServer(botConnector BotConnector, db *sql.DB) *WebServer {
	return &WebServer{
		botConnector: botConnector,
		clients:      make(map[*websocket.Conn]bool),
		db:           db,
	}
}

func (s *WebServer) StartServer(port string) {
	http.HandleFunc("/api/qrcode", s.handleGetQRCode)
	http.HandleFunc("/login", s.handleLogin)
	http.HandleFunc("/logout", s.handleLogout)
	http.HandleFunc("/disconnect", s.authMiddleware(s.handleDisconnect))
	http.HandleFunc("/ws", s.authMiddleware(s.handleWebSocket))
	http.HandleFunc("/", s.authMiddleware(s.handleDashboard))

	log.Printf("Starting web server on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start web server: %v", err)
	}
}

func (s *WebServer) broadcast(message interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}

	for client := range s.clients {
		if err := client.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("Failed to write message to client: %v", err)
			client.Close()
			delete(s.clients, client)
		}
	}
}

func (s *WebServer) handleGetQRCode(w http.ResponseWriter, r *http.Request) {
	qrCode, timestamp := s.botConnector.GetLatestQRCode()

	// Convert QR code to base64 for image embedding
	// Note: The whatsmeow QR code is already a string that needs to be converted to a data URI.
	// The frontend will handle the conversion from string to image.

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"qrCode":    qrCode,
		"timestamp": timestamp.Unix(),
	})
}

func (s *WebServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		username := r.FormValue("username")
		password := r.FormValue("password")

		user, err := data.GetUserByUsername(s.db, username)
		if err != nil {
			http.Redirect(w, r, "/login?error=invalid_credentials", http.StatusFound)
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
		if err != nil {
			http.Redirect(w, r, "/login?error=invalid_credentials", http.StatusFound)
			return
		}

		tokenBytes := make([]byte, 16)
		_, err = rand.Read(tokenBytes)
		if err != nil {
			http.Error(w, "Could not generate session token", http.StatusInternalServerError)
			return
		}
		token := hex.EncodeToString(tokenBytes)

		_, err = data.CreateUserSession(s.db, user.ID, token, 24)
		if err != nil {
			log.Printf("Could not create session: %v", err)
			http.Error(w, "Could not create session", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     sessionCookieName,
			Value:    token,
			Expires:  time.Now().Add(24 * time.Hour),
			Path:     "/",
			HttpOnly: true,
			Secure:   r.TLS != nil,
		})

		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	tmpl, err := template.ParseFS(templates, "templates/login.html")
	if err != nil {
		http.Error(w, "Could not parse login template", http.StatusInternalServerError)
		return
	}
	tmpl.Execute(w, nil)
}

func (s *WebServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

	err = data.DeleteUserSessionByToken(s.db, cookie.Value)
	if err != nil {
		log.Printf("Failed to delete session: %v", err)
	}

	http.SetCookie(w, &http.Cookie{
		Name:   sessionCookieName,
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})

	http.Redirect(w, r, "/login", http.StatusFound)
}

func (s *WebServer) handleDashboard(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFS(templates, "templates/dashboard.html")
	if err != nil {
		http.Error(w, "Could not parse dashboard template", http.StatusInternalServerError)
		return
	}
	tmpl.Execute(w, nil)
}

func (s *WebServer) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s.botConnector.Disconnect()
	http.Redirect(w, r, "/", http.StatusFound)
}

func (s *WebServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}
	defer conn.Close()

	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
	}()

	s.sendStatus(conn)

	for {
		if _, _, err := conn.NextReader(); err != nil {
			break
		}
	}
}

func (s *WebServer) NotifyConnectionStatus(isConnected bool) {
	status := "disconnected"
	if isConnected {
		status = "connected"
	}
	message := map[string]string{"type": "status", "payload": status}
	s.broadcast(message)
}

func (s *WebServer) sendStatus(conn *websocket.Conn) {
	status := "disconnected"
	if s.botConnector.GetIsConnected() {
		status = "connected"
	}
	message := map[string]string{"type": "status", "payload": status}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal status message: %v", err)
		return
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("Failed to write initial status to client: %v", err)
	}
}

func (s *WebServer) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		session, err := data.GetUserSessionByToken(s.db, cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		if !session.ExpiresAt.Valid || time.Now().After(session.ExpiresAt.Time) {
			data.DeleteUserSessionByToken(s.db, cookie.Value)
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		next.ServeHTTP(w, r)
	}
}
