package data

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func NewDB() (*sql.DB, error) {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

type User struct {
	ID           int
	Username     string
	PasswordHash string
}

type UserSession struct {
	ID        int
	UserID    int
	Token     string
	ExpiresAt sql.NullTime
}

func RunMigrations() {
	db, err := NewDB()
	if err != nil {
		log.Fatalf("Erro ao conectar ao banco de dados para migrations: %v", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("Erro ao criar instância do driver de migração: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres", driver)
	if err != nil {
		log.Fatalf("Erro ao criar instância de migração: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Erro ao aplicar migrations: %v", err)
	}

	log.Println("Migrations aplicadas com sucesso!")
}

func CreateAdminUserIfNotExists(db *sql.DB) {
	username := os.Getenv("USERNAME")
	password := os.Getenv("PASSWORD")

	if username == "" || password == "" {
		log.Println("USERNAME ou PASSWORD não definidos no .env, pulando criação do usuário admin.")
		return
	}

	_, err := GetUserByUsername(db, username)
	if err == nil {
		// User already exists
		return
	}

	if err != sql.ErrNoRows {
		log.Printf("Erro ao checar se usuário admin existe: %v", err)
		return
	}

	// User does not exist, create it
	_, err = CreateUser(db, username, password)
	if err != nil {
		log.Printf("Erro ao criar usuário admin: %v", err)
		return
	}

	log.Printf("Usuário admin '%s' criado com sucesso.", username)
}

func CreateUser(db *sql.DB, username, password string) (*User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	query := `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, password_hash`
	row := db.QueryRow(query, username, string(hashedPassword))

	var user User
	err = row.Scan(&user.ID, &user.Username, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByUsername(db *sql.DB, username string) (*User, error) {
	query := `SELECT id, username, password_hash FROM users WHERE username=$1`
	row := db.QueryRow(query, username)

	var user User
	err := row.Scan(&user.ID, &user.Username, &user.PasswordHash)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func CreateUserSession(db *sql.DB, userID int, token string, durationHours int) (*UserSession, error) {
	log.Printf("Interval set as %d", durationHours)
	query := `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + (INTERVAL '1 hour' * $3)) RETURNING id, user_id, token, expires_at`
	row := db.QueryRow(query, userID, token, durationHours)

	var session UserSession
	err := row.Scan(&session.ID, &session.UserID, &session.Token, &session.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func GetUserSessionByToken(db *sql.DB, token string) (*UserSession, error) {
	query := `SELECT id, user_id, token, expires_at FROM user_sessions WHERE token=$1`
	row := db.QueryRow(query, token)

	var session UserSession
	err := row.Scan(&session.ID, &session.UserID, &session.Token, &session.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func DeleteUserSessionByToken(db *sql.DB, token string) error {
	query := `DELETE FROM user_sessions WHERE token=$1`
	_, err := db.Exec(query, token)
	return err
}

func DeleteWppSessionByJID(db *sql.DB, jid string) error {
	query := `selecct * FROM whatsmeow_sessions WHERE jid~=$1`
	_, err := db.Exec(query, jid)
	return err
}
