import { Controller } from "@hotwired/stimulus"
import consumer from "../channels/consumer"

export default class extends Controller {
  static targets = ["playersList"]
  
  connect() {
    if (this.hasGameIdValue) {
      this.channel = consumer.subscriptions.create(
        { channel: "GameChannel", game_id: this.gameIdValue },
        {
          connected: this._connected.bind(this),
          disconnected: this._disconnected.bind(this),
          received: this._received.bind(this)
        }
      )
    }
  }
  
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
    }
  }
  
  _connected() {
    console.log("Connected to game channel")
  }
  
  _disconnected() {
    console.log("Disconnected from game channel")
  }
  
  _received(data) {
    console.log("Received data:", data)
    
    if (data.type === "player_joined") {
      this.addPlayer(data.player)
    } else if (data.type === "game_started") {
      window.location.reload()
    }
  }
  
  addPlayer(player) {
    if (!document.getElementById(`player-${player.id}`)) {
      const playerElement = document.createElement('p')
      playerElement.id = `player-${player.id}`
      playerElement.innerHTML = `<strong>${player.username}</strong>`
      this.playersListTarget.appendChild(playerElement)
    }
  }
  
  static values = {
    gameId: Number
  }
}
