package wa

import (
	"context"
	"log"
	"time"

	goLog "go.mau.fi/whatsmeow/util/log"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	_ "modernc.org/sqlite"
)

// Manager mantém o client do whatsmeow
type Manager struct {
	Client *whatsmeow.Client
}

// NewManager cria o container + device + client
func NewManager(dsn string) (*Manager, error) {
	ctx := context.Background()
	container, err := sqlstore.New(ctx, "sqlite", dsn, goLog.Noop)
	if err != nil {
		return nil, err
	}
	device, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, err
	}
	cl := whatsmeow.NewClient(device, goLog.Noop)
	return &Manager{Client: cl}, nil
}

// ConnectWithQR cobre 3 fluxos:
// - já tem sessão: conecta e envia "PAIRED"
// - consegue QR: emite códigos até parear
// - fallback (sem QR): conecta e envia "PAIRED"
func (m *Manager) ConnectWithQR(ctx context.Context, qrCb func(string)) error {
	// se já tem sessão salva, só conectar
	if m.Client.Store.ID != nil {
		if err := m.Client.Connect(); err != nil {
			return err
		}
		qrCb("PAIRED")
		return nil
	}

	// tentar abrir canal de QR
	qr, err := m.Client.GetQRChannel(ctx)
	if err != nil {
		// fallback: conecta mesmo sem QR
		if err2 := m.Client.Connect(); err2 != nil {
			return err2
		}
		qrCb("PAIRED")
		return nil
	}

	// ouvir eventos do QR
	go func() {
		for evt := range qr {
			switch evt.Event {
			case "code":
				qrCb(evt.Code)
			case "success":
				log.Println("paired!")
				qrCb("PAIRED")
			case "timeout", "error":
				log.Printf("pair failed: %s", evt.Event)
			}
		}
	}()

	// conectar (dispara a geração do primeiro QR)
	return m.Client.Connect()
}

// Pair code
func (m *Manager) ConnectWithPairCode(ctx context.Context, phone string) (string, error) {
	if err := m.Client.Connect(); err != nil {
		return "", err
	}
	time.Sleep(time.Second)
	code, err := m.Client.PairPhone(ctx, phone, true, 0, "Chrome (Windows)")
	return code, err
}

// -------- Utilitários --------

// NormalizeUserJID unifica server (evita LID/c.us duplicar conversas)
func NormalizeUserJID(j types.JID) types.JID {
	s := j.Server
	if s == "lid" || s == "c.us" || s == "" {
		j.Server = types.DefaultUserServer // "s.whatsapp.net"
	}
	return j.ToNonAD()
}
