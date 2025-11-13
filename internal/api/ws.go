package api

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*websocket.Conn]bool
	mu sync.Mutex
	upgrader websocket.Upgrader
}

func NewHub() *Hub {
	return &Hub{
		clients: map[*websocket.Conn]bool{},
		upgrader: websocket.Upgrader{ CheckOrigin: func(r *http.Request) bool { return true } },
	}
}

func (h *Hub) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil { log.Println("ws upgrade:", err); return }
	h.mu.Lock(); h.clients[conn] = true; h.mu.Unlock()
	go func(){
		for {
			if _, _, err := conn.ReadMessage(); err != nil { break }
		}
		h.mu.Lock(); delete(h.clients, conn); h.mu.Unlock()
		_ = conn.Close()
	}()
}

func (h *Hub) Broadcast(v any) {
	b, _ := json.Marshal(v)
	h.mu.Lock(); defer h.mu.Unlock()
	for c := range h.clients {
		_ = c.WriteMessage(websocket.TextMessage, b)
	}
}
