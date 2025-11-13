package wa

import (
	"context"
	"mime"
	"path/filepath"

	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
)

func (m *Manager) SendImage(ctx context.Context, to types.JID, bytes []byte, filename string) error {
	mt := mime.TypeByExtension(filepath.Ext(filename))
	if mt == "" {
		mt = "image/jpeg"
	}
	resp, err := m.Client.Upload(ctx, bytes, whatsmeow.MediaImage)
	if err != nil {
		return err
	}
	msg := &waE2E.ImageMessage{
		Mimetype:      &mt,
		URL:           &resp.URL,
		DirectPath:    &resp.DirectPath,
		MediaKey:      resp.MediaKey,
		FileEncSHA256: resp.FileEncSHA256,
		FileSHA256:    resp.FileSHA256,
		FileLength:    &resp.FileLength,
	}
	_, err = m.Client.SendMessage(ctx, to, &waE2E.Message{ImageMessage: msg})
	return err
}

func (m *Manager) SendVideo(ctx context.Context, to types.JID, bytes []byte, filename string) error {
	mt := mime.TypeByExtension(filepath.Ext(filename))
	if mt == "" {
		mt = "video/mp4"
	}
	resp, err := m.Client.Upload(ctx, bytes, whatsmeow.MediaVideo)
	if err != nil {
		return err
	}
	msg := &waE2E.VideoMessage{
		Mimetype:      &mt,
		URL:           &resp.URL,
		DirectPath:    &resp.DirectPath,
		MediaKey:      resp.MediaKey,
		FileEncSHA256: resp.FileEncSHA256,
		FileSHA256:    resp.FileSHA256,
		FileLength:    &resp.FileLength,
		// GifPlayback: proto.Bool(false) // se quiser forçar como GIF
	}
	_, err = m.Client.SendMessage(ctx, to, &waE2E.Message{VideoMessage: msg})
	return err
}

func (m *Manager) SendDocument(ctx context.Context, to types.JID, bytes []byte, filename string) error {
	mt := mime.TypeByExtension(filepath.Ext(filename))
	if mt == "" {
		mt = "application/octet-stream"
	}
	resp, err := m.Client.Upload(ctx, bytes, whatsmeow.MediaDocument)
	if err != nil {
		return err
	}
	msg := &waE2E.DocumentMessage{
		FileName:      &filename,
		Mimetype:      &mt,
		URL:           &resp.URL,
		DirectPath:    &resp.DirectPath,
		MediaKey:      resp.MediaKey,
		FileEncSHA256: resp.FileEncSHA256,
		FileSHA256:    resp.FileSHA256,
		FileLength:    &resp.FileLength,
	}
	_, err = m.Client.SendMessage(ctx, to, &waE2E.Message{DocumentMessage: msg})
	return err
}

func (m *Manager) SendAudioPTT(ctx context.Context, to types.JID, bytes []byte, filename string) error {
	// PTT (mensagem de voz) do WhatsApp é ogg/opus
	mt := "audio/ogg; codecs=opus"

	resp, err := m.Client.Upload(ctx, bytes, whatsmeow.MediaAudio)
	if err != nil {
		return err
	}

	ptt := true
	msg := &waE2E.AudioMessage{
		PTT:           &ptt, // <- ATENÇÃO: PTT (maiúsculo)
		Mimetype:      &mt,
		URL:           &resp.URL,
		DirectPath:    &resp.DirectPath,
		MediaKey:      resp.MediaKey,
		FileEncSHA256: resp.FileEncSHA256,
		FileSHA256:    resp.FileSHA256,
		FileLength:    &resp.FileLength,
		// Seconds:    proto.Uint32( ... ) // opcional, se quiser setar duração
	}

	_, err = m.Client.SendMessage(ctx, to, &waE2E.Message{AudioMessage: msg})
	return err
}
