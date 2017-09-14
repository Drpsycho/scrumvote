package main

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"time"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

type user struct {
	Id          string `json:"Id"`
	Name        string `json:"Name"`
	Value       int    `json:"Value"`
	Ghost       bool   `json:"Ghost"`
	ScrumMaster bool   `json:"ScrumMaster"`
}
type regmsg struct {
	Cmd  string `json:"Cmd"`
	User user
}
type inwsmsg struct {
	Cmd  string `json:"Cmd"`
	User user
}
type outwsmsg struct {
	Cmd   string `json:"Cmd"`
	Users []user
}

// connection is an middleman between the websocket connection and the hub.
type connection struct {
	// The websocket connection.
	ws *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	userinfo inwsmsg
}

func serverWs(rw http.ResponseWriter, req *http.Request) {
	ws, err := upgrader.Upgrade(rw, req, nil)
	if err != nil {
		log.Print("upgrade smt went wron!:", err)
		return
	}
	defer ws.Close()

	c := &connection{ws: ws, send: make(chan []byte, 256)}
	c.userinfo.User.Id = RandId()
	c.userinfo.User.Ghost = true
	c.userinfo.User.ScrumMaster = false

	HubHandler.register <- c
	go c.writePump()
	c.readPump()
}

// write writes a message with the given message type and payload.
func (c *connection) write(mt int, payload []byte) error {
	c.ws.SetWriteDeadline(time.Now().Add(writeWait))
	return c.ws.WriteMessage(mt, payload)
}

// writePump pumps messages from the hub to the websocket connection.
func (c *connection) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.ws.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.write(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.write(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.write(websocket.PingMessage, []byte{}); err != nil {
				return
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the hub.
func (c *connection) readPump() {
	defer func() {
		HubHandler.unregister <- c
		c.ws.Close()
	}()

	c.ws.SetReadLimit(maxMessageSize)
	c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error { c.ws.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			break
		}

		var dat inwsmsg

		if err := json.Unmarshal(message, &dat); err != nil {
			log.Println(err)
			continue
		}

		switch dat.Cmd {
		case "reg":
			{
				res, _ := json.Marshal(regmsg{
					Cmd:  "setid",
					User: c.userinfo.User})
				c.write(websocket.TextMessage, res)
			}

			HubHandler.broadcast <- GetAllUsers()

		case "update":
			c.userinfo.User.Ghost = dat.User.Ghost
			c.userinfo.User.Name = dat.User.Name
			c.userinfo.User.Value = dat.User.Value
			HubHandler.broadcast <- GetAllUsers()

		case "chage_state":
			c.userinfo.User.Ghost = dat.User.Ghost
			HubHandler.broadcast <- GetAllUsers()
		case "im_scrum_master":
			c.userinfo.User.ScrumMaster = true
			HubHandler.broadcast <- GetAllUsers()
		case "reset":
			var users []user
			for it := range HubHandler.connections {
				it.userinfo.User.Value = 0
				users = append(users, it.userinfo.User)
			}
			res, _ := json.Marshal(outwsmsg{
				Cmd:   "update",
				Users: users})
			HubHandler.broadcast <- res
        case "hard_reset":
			var users []user
			for it := range HubHandler.connections {
				it.userinfo.User.Value = 0
                it.userinfo.User.Ghost = true
				users = append(users, it.userinfo.User)
			}
			res, _ := json.Marshal(outwsmsg{
				Cmd:   "update",
				Users: users})
			HubHandler.broadcast <- res
		}
	}
}

func GetAllUsers() []byte {
	var users []user
	for it := range HubHandler.connections {
		users = append(users, it.userinfo.User)
	}

	res, _ := json.Marshal(outwsmsg{
		Cmd:   "update",
		Users: users})
	return res
}
