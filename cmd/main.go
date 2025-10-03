package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	_ "github.com/mattn/go-sqlite3"
	"github.com/mdp/qrterminal"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// ---------- Conexão ----------

func WAConnect() (*whatsmeow.Client, error) {
	// Usar diretório data para persistir o banco de dados
	dbPath := "file:./data/wapp.db?_foreign_keys=on"

	// Criar diretório data se não existir
	if err := os.MkdirAll("./data", 0755); err != nil {
		return nil, fmt.Errorf("erro ao criar diretório data: %v", err)
	}

	container, err := sqlstore.New(context.Background(), "sqlite3", dbPath, waLog.Noop)
	if err != nil {
		return nil, err
	}
	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		panic(err)
	}
	client := whatsmeow.NewClient(deviceStore, waLog.Noop)
	if client.Store.ID == nil {
		// No ID stored, new login
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			return nil, err
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
			} else {
				fmt.Println("Login event:", evt.Event)
			}
		}
	} else {
		err := client.Connect()
		if err != nil {
			return nil, err
		}
	}
	return client, nil
}

// ---------- Utils ----------

func jidToString(jids []types.JID) []string {
	var jidStrings []string
	for _, jid := range jids {
		jidStrings = append(jidStrings, jid.String())
	}
	return jidStrings
}

// Contexto de resposta: só é preenchido quando o comando citou outra mensagem
type ReplyContext struct {
	stanzaID      string
	participant   string
	quotedMessage *waProto.Message
}

// Extrai, do comando recebido, a mensagem citada (se houver)
func buildReplyContextFrom(evt *events.Message) *ReplyContext {
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
	return &ReplyContext{
		stanzaID:      ci.GetStanzaID(),
		participant:   ci.GetParticipant(),
		quotedMessage: ci.GetQuotedMessage(),
	}
}

// Envia mensagem. Só cria ContextInfo para citação se replyCtx != nil.
// Menções (MentionedJID) continuam funcionando com ou sem citação.
func sendMessage(client *whatsmeow.Client, chat types.JID, text string, replyCtx *ReplyContext, mentionedJIDs []types.JID) {
	msg := &waProto.Message{}

	// Cria ExtendedTextMessage se houver citação OU menções
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
		// Sem citação e sem menções: mensagem simples
		msg.Conversation = &text
	}

	if _, err := client.SendMessage(context.Background(), chat, msg); err != nil {
		fmt.Printf("Erro ao enviar mensagem: %v\n", err)
	}
}

// ---------- Comandos ----------

func handleCommand(client *whatsmeow.Client, message string, evt *events.Message) {
	if !strings.HasPrefix(message, "!") {
		return
	}

	// Só vamos citar algo se o comando JÁ tiver citado algo
	replyCtx := buildReplyContextFrom(evt)

	commandText := strings.TrimPrefix(message, "!")
	parts := strings.Fields(commandText)
	if len(parts) == 0 {
		return
	}

	command := strings.ToLower(parts[0])
	args := parts[1:]

	fmt.Printf("Comando recebido: %s, Args: %v\n", command, args)

	switch command {
	case "help", "ajuda":
		response := "🤖 *Comandos disponíveis:*\n\n" +
			"!help - Mostra esta mensagem\n" +
			"!all - Menciona todos os participantes do grupo\n" +
			"!ping - Testa se o bot está funcionando\n" +
			"!echo <mensagem> - Repete a mensagem\n" +
			"!info - Informações sobre o bot"
		sendMessage(client, evt.Info.Chat, response, replyCtx, nil)

	case "ping":
		sendMessage(client, evt.Info.Chat, "🏓 Pong! Bot está online!", replyCtx, nil)

	case "echo":
		if len(args) > 0 {
			sendMessage(client, evt.Info.Chat, "📢 "+strings.Join(args, " "), replyCtx, nil)
		} else {
			sendMessage(client, evt.Info.Chat, "❌ Uso: !echo <mensagem>", replyCtx, nil)
		}

	case "info":
		response := "🤖 *WhatsApp Bot em Go*\n\n" +
			"Versão: 1.0.0\n" +
			"Desenvolvido com whatsmeow\n" +
			"Digite !help para ver os comandos"
		sendMessage(client, evt.Info.Chat, response, replyCtx, nil)

	case "all":
		if !evt.Info.IsGroup {
			sendMessage(client, evt.Info.Chat, "❌ Este comando só pode ser usado em grupos.", replyCtx, nil)
			return
		}

		groupInfo, err := client.GetGroupInfo(evt.Info.Chat)
		if err != nil {
			fmt.Printf("Erro ao obter informações do grupo: %v\n", err)
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

		// Se o comando citou algo, a resposta cita a MESMA mensagem.
		// Se não citou, a resposta NÃO cita nada (apenas menções).
		sendMessage(client, evt.Info.Chat, text, replyCtx, mentionedJIDs)

	default:
		sendMessage(client, evt.Info.Chat, "❌ Comando não reconhecido: "+command+"\n\nDigite !help para ver os comandos disponíveis.", replyCtx, nil)
	}
}

// ---------- Main ----------

func main() {
	log.Println("Iniciando bot do WhatsApp...")

	client, err := WAConnect()
	if err != nil {
		log.Fatalf("Erro ao conectar: %v", err)
	}

	fmt.Println("Conectado com sucesso!")
	fmt.Println("Bot está escutando mensagens...")
	fmt.Println("Envie !help para ver os comandos disponíveis")

	client.AddEventHandler(func(evt interface{}) {
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

			sender := v.Info.Sender.String()
			chat := v.Info.Chat.String()

			fmt.Printf("Mensagem recebida de %s em %s: %s\n", sender, chat, message)

			handleCommand(client, message, v)
		}
	})

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	client.Disconnect()
	fmt.Println("Bot desconectado.")
}
