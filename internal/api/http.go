package api

import (
	"context"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mau.fi/whatsmeow/types"

	"meowcrm/internal/wa"
)

type Server struct {
	WAM *wa.Manager
	Hub *Hub
}

func NewServer(wam *wa.Manager, hub *Hub) *Server { return &Server{WAM: wam, Hub: hub} }

var reDigits = regexp.MustCompile(`^[0-9]+$`)

func (s *Server) Routes() *gin.Engine {
	r := gin.Default()
	r.MaxMultipartMemory = 32 << 20

	// CORS simples p/ dev
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
		if c.Request.Method == http.MethodOptions {
			c.Status(200)
			c.Abort()
			return
		}
		c.Next()
	})

	// SSE do QR — mantém conexão aberta + pings
	r.GET("/auth/qr", func(c *gin.Context) {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no")

		ctx := c.Request.Context()

		if err := s.WAM.ConnectWithQR(ctx, func(code string) {
			_, _ = io.WriteString(c.Writer, "event: qr\n")
			_, _ = io.WriteString(c.Writer, "data: "+code+"\n\n")
			c.Writer.Flush()
		}); err != nil {
			_, _ = io.WriteString(c.Writer, "event: error\n")
			_, _ = io.WriteString(c.Writer, "data: "+err.Error()+"\n\n")
			c.Writer.Flush()
			return
		}

		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_, _ = io.WriteString(c.Writer, ": ping\n\n")
				c.Writer.Flush()
			}
		}
	})

	// Pair code
	r.POST("/auth/paircode", func(c *gin.Context) {
		var body struct {
			Phone string `json:"phone"`
		}
		if err := c.BindJSON(&body); err != nil {
			c.Status(400)
			return
		}
		code, err := s.WAM.ConnectWithPairCode(c, body.Phone)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"code": code})
	})

	// Enviar texto (aceita número puro, JID ou LID)
	r.POST("/messages/text", func(c *gin.Context) {
		var body struct {
			To   string `json:"to"`
			Text string `json:"text"`
		}
		if err := c.BindJSON(&body); err != nil {
			c.Status(400)
			return
		}
		var jid types.JID
		var err error

		switch {
		case reDigits.MatchString(body.To):
			// número puro -> JID padrão
			jid = types.NewJID(body.To, types.DefaultUserServer)
		case strings.HasSuffix(strings.ToLower(body.To), "@lid"):
			// LID explícito — usar como está
			jid, err = types.ParseJID(body.To)
			if err != nil {
				c.JSON(400, gin.H{"error": "lid inválido"})
				return
			}
		default:
			jid, err = types.ParseJID(body.To)
			if err != nil {
				c.JSON(400, gin.H{"error": "jid inválido"})
				return
			}
		}

		if err := s.WAM.SendText(context.Background(), jid, body.Text); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Status(204)
	})

	// Enviar imagem (multipart)
	r.POST("/messages/image", func(c *gin.Context) {
		to := c.PostForm("to")
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "file required"})
			return
		}
		fh, err := file.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		defer fh.Close()
		b, err := io.ReadAll(fh)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var jid types.JID
		if j, e := types.ParseJID(to); e == nil {
			jid = wa.NormalizeUserJID(j)
		} else if reDigits.MatchString(to) {
			jid = wa.NormalizeUserJID(types.NewJID(to, types.DefaultUserServer))
		} else {
			c.JSON(400, gin.H{"error": "jid inválido"})
			return
		}

		if err := s.WAM.SendImage(c, jid, b, file.Filename); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Status(204)
	})

	// Enviar vídeo (multipart)
	r.POST("/messages/video", func(c *gin.Context) {
		to := c.PostForm("to")
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "file required"})
			return
		}
		fh, err := file.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		defer fh.Close()
		b, err := io.ReadAll(fh)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var jid types.JID
		if j, e := types.ParseJID(to); e == nil {
			jid = wa.NormalizeUserJID(j)
		} else if reDigits.MatchString(to) {
			jid = wa.NormalizeUserJID(types.NewJID(to, types.DefaultUserServer))
		} else {
			c.JSON(400, gin.H{"error": "jid inválido"})
			return
		}

		if err := s.WAM.SendVideo(c, jid, b, file.Filename); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Status(204)
	})

	// Enviar documento (multipart)
	r.POST("/messages/document", func(c *gin.Context) {
		to := c.PostForm("to")
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "file required"})
			return
		}
		fh, err := file.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		defer fh.Close()
		b, err := io.ReadAll(fh)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var jid types.JID
		if j, e := types.ParseJID(to); e == nil {
			jid = wa.NormalizeUserJID(j)
		} else if reDigits.MatchString(to) {
			jid = wa.NormalizeUserJID(types.NewJID(to, types.DefaultUserServer))
		} else {
			c.JSON(400, gin.H{"error": "jid inválido"})
			return
		}

		if err := s.WAM.SendDocument(c, jid, b, file.Filename); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Status(204)
	})

	// Enviar áudio PTT (multipart)
	r.POST("/messages/audio", func(c *gin.Context) {
		to := c.PostForm("to")
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "file required"})
			return
		}
		fh, err := file.Open()
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		defer fh.Close()
		b, err := io.ReadAll(fh)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var jid types.JID
		if j, e := types.ParseJID(to); e == nil {
			jid = wa.NormalizeUserJID(j)
		} else if reDigits.MatchString(to) {
			jid = wa.NormalizeUserJID(types.NewJID(to, types.DefaultUserServer))
		} else {
			c.JSON(400, gin.H{"error": "jid inválido"})
			return
		}

		if err := s.WAM.SendAudioPTT(c, jid, b, file.Filename); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Status(204)
	})

	// WebSocket
	r.GET("/ws", func(c *gin.Context) { s.Hub.Handle(c.Writer, c.Request) })

	// >>> não esquecer do return! <<<
	return r
}
