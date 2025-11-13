package wa

import (
	"context"
	"encoding/base64"
	"time"

	waE2E "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	gproto "google.golang.org/protobuf/proto"
)

func (m *Manager) RegisterHandlers(dispatch func(any)) {
	m.Client.AddEventHandler(func(raw interface{}) {
		switch ev := raw.(type) {
		case *events.Message:
			msg := ev.Message
			info := ev.Info

			// Extrair IDs
			chat := info.Chat     // types.JID
			sender := info.Sender // types.JID

			// Preparar payload
			out := map[string]any{
				"type":      "message",
				"id":        info.ID,
				"fromMe":    info.IsFromMe,
				"at":        info.Timestamp.UnixMilli(),
				"text":      "",
				"chatJID":   "", // preferir JID quando existir
				"chatLID":   "", // se vier LID, preencher
				"senderJID": "",
				"senderLID": "",
			}

			// Preencher JID/LID de chat e sender
			if chat.Server == "lid" {
				out["chatLID"] = chat.String()
			} else {
				out["chatJID"] = chat.ToNonAD().String()
			}
			if sender.Server == "lid" {
				out["senderLID"] = sender.String()
			} else if sender.User != "" {
				out["senderJID"] = sender.ToNonAD().String()
			}

			// Texto
			if txt := msg.GetConversation(); txt != "" {
				out["text"] = txt
			}
			if ext := msg.GetExtendedTextMessage(); ext != nil && ext.GetText() != "" {
				out["text"] = ext.GetText()
			}

			// Função para anexar mídia como dataURL
			attach := func(kind, mime string, data []byte, filename string) {
				if len(data) == 0 {
					return
				}
				out["media"] = map[string]any{
					"kind":     kind, // image|video|audio|document
					"mime":     mime,
					"filename": filename,
					"dataURL":  "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data),
				}
			}

			// Baixar mídia (se houver)
			ctx := context.Background()
			if im := msg.GetImageMessage(); im != nil {
				if b, err := m.Client.Download(ctx, im); err == nil {
					attach("image", im.GetMimetype(), b, "")
				}
			}
			if vm := msg.GetVideoMessage(); vm != nil {
				if b, err := m.Client.Download(ctx, vm); err == nil {
					attach("video", vm.GetMimetype(), b, "")
				}
			}
			if am := msg.GetAudioMessage(); am != nil {
				if b, err := m.Client.Download(ctx, am); err == nil {
					attach("audio", am.GetMimetype(), b, "")
				}
			}
			if dm := msg.GetDocumentMessage(); dm != nil {
				if b, err := m.Client.Download(ctx, dm); err == nil {
					attach("document", dm.GetMimetype(), b, dm.GetFileName())
				}
			}

			dispatch(out)

		default:
			// Receipts/presence/etc, reencaminhar como estão
			dispatch(raw)
		}
	})
}

func (m *Manager) MarkRead(chat, sender types.JID, ids []types.MessageID) error {
	return m.Client.MarkRead(context.Background(), ids, time.Now(), chat, sender, types.ReceiptTypeRead)
}

func (m *Manager) SendText(ctx context.Context, to types.JID, text string) error {
	// NÃO converter @lid para s.whatsapp.net aqui.
	_, err := m.Client.SendMessage(ctx, to, &waE2E.Message{
		Conversation: gproto.String(text),
	})
	return err
}
