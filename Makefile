deps:
	go mod tidy

run: deps
	go run ./cmd/server
