package bot

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mdp/qrterminal"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

type Bot struct {
	client          *whatsmeow.Client
	mu              sync.Mutex
	isConnected     bool
	qrCodeChan      chan string
	latestQRCode    string
	qrCodeTimestamp time.Time
}

func NewBot() *Bot {
	return &Bot{
		qrCodeChan: make(chan string),
	}
}

func (b *Bot) Connect() error {
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)

	logDevice := waLog.Stdout("Device", "DEBUG", true)
	container, err := sqlstore.New(context.Background(), "postgres", dbURL, logDevice)
	if err != nil {
		return err
	}
	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		return err
	}
	clientLog := waLog.Stdout("Client", "DEBUG", true)
	b.client = whatsmeow.NewClient(deviceStore, clientLog)
	b.client.AddEventHandler(b.eventHandler)

	if b.client.Store.ID == nil {
		qrChan, _ := b.client.GetQRChannel(context.Background())
		err = b.client.Connect()
		if err != nil {
			return err
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				b.mu.Lock()
				b.latestQRCode = evt.Code
				b.qrCodeTimestamp = time.Now()
				b.mu.Unlock()
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
			} else {
				log.Printf("Login event: %s", evt.Event)
				if evt.Event == "success" {
					b.setIsConnected(true)
				}
			}
		}
	} else {
		err := b.client.Connect()
		if err != nil {
			return err
		}
		b.setIsConnected(true)
	}
	return nil
}

func (b *Bot) Disconnect() {
	if b.client != nil {
		b.client.Disconnect()
		b.setIsConnected(false)
	}
}

func (b *Bot) GetIsConnected() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.isConnected
}

func (b *Bot) setIsConnected(status bool) {
	b.mu.Lock()
	b.isConnected = status
	b.mu.Unlock()
}

func (b *Bot) GetQRCode() <-chan string {
	// This is no longer the primary way to get QR code, but keeping it for now to avoid breaking changes.
	return b.qrCodeChan
}

func (b *Bot) GetLatestQRCode() (string, time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.latestQRCode, b.qrCodeTimestamp
}

func (b *Bot) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		if v.Info.IsFromMe {
			return
		}

		var message string
		if v.Message.GetConversation() != "" {
			message = v.Message.GetConversation()
		} else if v.Message.GetExtendedTextMessage() != nil {
			message = v.Message.GetExtendedTextMessage().GetText()
		} else {
			return
		}
		b.handleCommand(message, v)
	case *events.Disconnected:
		b.setIsConnected(false)
		log.Println("Disconnected from WhatsApp")
	}
}

func (b *Bot) handleCommand(message string, evt *events.Message) {
	if !strings.HasPrefix(message, "!") {
		return
	}

	replyCtx := buildReplyContextFrom(evt)

	commandText := strings.TrimPrefix(message, "!")
	parts := strings.Fields(commandText)
	if len(parts) == 0 {
		return
	}

	command := strings.ToLower(parts[0])
	args := parts[1:]

	log.Printf("Comando '%s' recebido de %s (grupo: %t). Argumentos: %v", command, evt.Info.Sender, evt.Info.IsGroup, args)

	switch command {
	case "help", "ajuda":
		response := `🤖 *Comandos disponíveis:*
			!help - Mostra esta mensagem
			!all - Menciona todos os participantes do grupo
			!ping - Testa se o bot está funcionando
			!info - Informações sobre o bot`
		b.sendMessage(evt.Info.Chat, response, replyCtx, nil)

	case "ping":
		b.sendMessage(evt.Info.Chat, "🏓 Pong! Bot está online!", replyCtx, nil)

	case "info":
		response := `🤖 *WhatsApp Bot da Guerreiros do Almirante 💢*
			Versão: 1.0.0
			Desenvolvido com whatsmeow pelo Departamento de Tecnologia - GDA
			Contato: tecnologia@guerreirosdoalmirante.com.br
			Digite !help para ver os comandos`
		b.sendMessage(evt.Info.Chat, response, replyCtx, nil)

	case "all":
		if !evt.Info.IsGroup {
			b.sendMessage(evt.Info.Chat, "❌ Este comando só pode ser usado em grupos.", replyCtx, nil)
			return
		}

		groupInfo, err := b.client.GetGroupInfo(evt.Info.Chat)
		if err != nil {
			log.Printf("Erro ao obter informações do grupo %s: %v\n", evt.Info.Chat, err)
			return
		}

		var mentions []string
		var mentionedJIDs []types.JID
		for _, p := range groupInfo.Participants {
			mentions = append(mentions, fmt.Sprintf("@%s", p.JID.User))
			mentionedJIDs = append(mentionedJIDs, p.JID)
		}

		text := strings.Join(mentions, " ")
		if len(args) > 0 {
			text = strings.Join(args, " ") + "\n\n" + text
		}

		b.sendMessage(evt.Info.Chat, text, replyCtx, mentionedJIDs)

	default:
		b.sendMessage(evt.Info.Chat, "❌ Comando não reconhecido: "+command+"\n\nDigite !help para ver os comandos disponíveis.", replyCtx, nil)
	}
}

func (b *Bot) sendMessage(chat types.JID, text string, replyCtx *replyContext, mentionedJIDs []types.JID) {
	msg := &waProto.Message{}

	if replyCtx != nil || len(mentionedJIDs) > 0 {
		ctx := &waProto.ContextInfo{}
		if replyCtx != nil {
			if replyCtx.stanzaID != "" {
				ctx.StanzaID = &replyCtx.stanzaID
			}
			if replyCtx.participant != "" {
				ctx.Participant = &replyCtx.participant
			}
			ctx.QuotedMessage = replyCtx.quotedMessage
		}
		if len(mentionedJIDs) > 0 {
			ctx.MentionedJID = jidToString(mentionedJIDs)
		}

		msg.ExtendedTextMessage = &waProto.ExtendedTextMessage{
			Text:        &text,
			ContextInfo: ctx,
		}
	} else {
		msg.Conversation = &text
	}

	if _, err := b.client.SendMessage(context.Background(), chat, msg); err != nil {
		log.Printf("Erro ao enviar mensagem para %s: %v\n", chat, err)
	}
}

func jidToString(jids []types.JID) []string {
	var jidStrings []string
	for _, jid := range jids {
		jidStrings = append(jidStrings, jid.String())
	}
	return jidStrings
}

type replyContext struct {
	stanzaID      string
	participant   string
	quotedMessage *waProto.Message
}

func buildReplyContextFrom(evt *events.Message) *replyContext {
	if evt == nil || evt.Message == nil {
		return nil
	}
	ext := evt.Message.GetExtendedTextMessage()
	if ext == nil {
		return nil
	}
	ci := ext.GetContextInfo()
	if ci == nil || ci.GetQuotedMessage() == nil {
		return nil
	}
	return &replyContext{
		stanzaID:      ci.GetStanzaID(),
		participant:   ci.GetParticipant(),
		quotedMessage: ci.GetQuotedMessage(),
	}
}
