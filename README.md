# Meow CRM (WhatsMeow + Go + React)

CRM de conversas estilo WhatsApp Web:
- Login via **QR** (SSE) ou **Pair Code**
- **Inbox** com conversas (JID/LID), bolhas, status ✓/✓✓/✓✓ (lido)
- **Mídia**: imagem, vídeo, áudio PTT (ogg/opus), documento
- **Tempo real** por WebSocket
- **Persistência no front** (localStorage) para não perder ao atualizar a página

> **Stack:** Go (Gin + WhatsMeow) • SQLite (modernc) • React + Vite • TypeScript

---

## ⚙️ Requisitos

- Go **1.21+** (recomendado 1.22+)
- Node.js **18+** (recomendado 20+)
- npm (ou pnpm/yarn)
- Porta **8080** livre (API) e **5173** (Vite)

---

## 🚀 Como rodar (dev)

### 1) Backend (Go)
```bash
# na raiz do projeto
cp .env.example .env
# garanta DSN do SQLite com FKs habilitadas
# .env:
# SQLITE_DSN=file:wa.db?_pragma=foreign_keys(ON)
# PORT=:8080

go env -w GOPROXY=https://proxy.golang.org,direct
go mod tidy

# rodar
make run        # ou: go run ./cmd/server
Você deve ver:

bash
Copiar código
GET /auth/qr
POST /auth/paircode
POST /messages/text
POST /messages/image
POST /messages/video
POST /messages/audio
POST /messages/document
GET /ws
API listening on :8080
2) Frontend (React/Vite)
bash
Copiar código
cd web
cp .env.example .env
# por padrão:
# VITE_API_BASE=http://localhost:8080
# VITE_WS_BASE=http://localhost:8080

npm install
npm run dev
Abra http://localhost:5173.

🔐 Login
Via QR (SSE)
Front chama GET /auth/qr (SSE) e desenha o QR no canvas.

Se já estiver pareado, o back envia o evento "PAIRED".

Via Pair Code
bash
Copiar código
curl -X POST http://localhost:8080/auth/paircode \
  -H 'Content-Type: application/json' \
  -d '{"phone":"55DDDNÚMERO"}'
No celular: Aparelhos conectados → Conectar com número de telefone → Digitar código (expira rápido).

✉️ Envio de mensagens
Texto:

bash
Copiar código
curl -X POST http://localhost:8080/messages/text \
  -H 'Content-Type: application/json' \
  -d '{"to":"5591999999999@s.whatsapp.net","text":"olá"}'
Imagem:

bash
Copiar código
curl -F to=5591999999999@s.whatsapp.net \
     -F file=@/caminho/foto.jpg \
     http://localhost:8080/messages/image
Vídeo:

bash
Copiar código
curl -F to=5591999999999@s.whatsapp.net \
     -F file=@/caminho/video.mp4 \
     http://localhost:8080/messages/video
Áudio PTT (ogg/opus):

bash
Copiar código
curl -F to=5591999999999@s.whatsapp.net \
     -F file=@/caminho/voz.ogg \
     http://localhost:8080/messages/audio
Documento:

bash
Copiar código
curl -F to=5591999999999@s.whatsapp.net \
     -F file=@/caminho/arquivo.pdf \
     http://localhost:8080/messages/document
LID/JID: a API aceita @lid. Se você só tiver LID (ex.: 123456@lid), pode enviar para ele; quando o JID aparecer em eventos futuros, o front mescla automaticamente (sem duplicar).

🔌 WebSocket (/ws)
Emite:

Mensagens normalizadas: type: "message", com chatJID, chatLID, fromMe, text, at, media (base64 dataURL).

Recibos: atualizam ✓/✓✓/✓✓ (lido/played) nas suas mensagens.

Presença/typing: ignorados no front (não viram bolha).

Exemplo (mensagem com imagem):

json
Copiar código
{
  "type": "message",
  "id": "ABCD123",
  "fromMe": false,
  "at": 1731500000000,
  "text": "foto",
  "chatJID": "5591...@s.whatsapp.net",
  "chatLID": "123456@lid",
  "media": {
    "kind": "image",
    "mime": "image/jpeg",
    "filename": "",
    "dataURL": "data:image/jpeg;base64,...."
  }
}
🧩 LID x JID (como o app lida)
Cada evento pode trazer:

chatJID (ex.: 5511999...@s.whatsapp.net)

chatLID (ex.: 123456789@lid)

O front mantém alias LID → JID e usa JID como chave preferida quando existir.

Se a conversa começou com LID, ela aparece com ...@lid. Quando chegar um evento com JID, o app mescla tudo sob o JID (sem duplicar a conversa).

Ao enviar:

Se existir JID, envia para JID;

Caso contrário, envia para LID.

🖼️ Suporte a mídia
Imagem: jpg, png, webp

Vídeo: mp4, webm (suporte depende do navegador)

Áudio PTT: ogg/opus

Documento: qualquer; no front vira download via dataURL

Em produção, prefira servir mídia por endpoint de download (ex.: /media/:id) ao invés de dataURL para economizar memória.

🧪 Troubleshooting
failed to upgrade database: foreign keys are not enabled

Use no .env:
SQLITE_DSN=file:wa.db?_pragma=foreign_keys(ON)
Apague wa.db e rode novamente.

/auth/qr 500

Geralmente já está pareado → handler envia "PAIRED". Veja logs.

jid inválido

Envie ...@s.whatsapp.net ou apenas dígitos (a API monta JID). Para LID, ...@lid.

Sem QR no front

Veja console do navegador; SSE pode ter fechado. O back mantém keep-alive e envia "PAIRED" quando aplicável.

CORS

Em dev, liberado para *. Em produção, restrinja ao seu domínio.

🧰 Scripts úteis
Backend:

bash
Copiar código
go fmt ./...
go vet ./...
make run
Frontend:

bash
Copiar código
cd web
npm run dev
npm run build
npm run preview
🏭 Produção (resumo)
Backend

GIN_MODE=release

Reverse proxy (Nginx/Caddy) + HTTPS

CORS restrito ao domínio do front

wa.db persistente (volume)

Frontend

npm run build e sirva /web/dist

Ajuste .env para URLs públicas do back (VITE_API_BASE, VITE_WS_BASE)

Use WSS (WebSocket TLS) quando estiver sob HTTPS

📄 Licença
Escolha a sua (ex.: MIT). Exemplo:

nginx
Copiar código
MIT © SeuNome
yaml
Copiar código

---

# 📄 web/README.md (opcional, dentro da pasta `web/`)

```markdown
# Frontend (web)

## Setup
```bash
cp .env.example .env
npm install
npm run dev
Variáveis
VITE_API_BASE — URL da API Go (ex.: http://localhost:8080)

VITE_WS_BASE — Base HTTP do WS (ex.: http://localhost:8080). O app converte para ws://.

Funcionalidades
Login via QR (SSE) e Pair Code

Inbox estilo WhatsApp Web (JID/LID), mídia (imagem, vídeo, áudio PTT, documento)

Status ✓/✓✓/✓✓ lido

Auto-scroll inteligente e persistência em localStorage

Build
bash
Copiar código
npm run build
npm run preview
yaml
Copiar código

---

# 🔒 .gitignore (coloque na raiz)

```gitignore
# Go
bin/
*.exe
*.test
*.out

# DB / cache
wa.db
*.sqlite
*.sqlite3

# Node
node_modules/
web/node_modules/
web/dist/
web/.vite/
web/.DS_Store

# Env
.env
web/.env

# IDE
.vscode/
.idea/
*.swp
