package main

import (
	"flag"
	"github.com/gorilla/websocket"
	"io"
	"log"
	"net/http"
    "time"
)

var addr = flag.String("addr", "localhost:9001", "http service address")

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func serveHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.Error(w, "Not found.", 404)
		return
	}
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", 405)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	io.WriteString(w, "<html><body><h1>scrum vote server</h1></body></html>")
}

func main() {
	flag.Parse()
	go HubHandler.run()
    go func(){
            for{
                time.Sleep(time.Second * 2)
                HubHandler.broadcast <- GetAllUsers()
            }
        }()
	http.HandleFunc("/", serveHome)
	http.HandleFunc("/handler", serverWs)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
