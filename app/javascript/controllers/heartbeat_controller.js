// Heartbeat to detect disconnected players
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    gameId: Number,
    interval: { type: Number, default: 15000 } // 15 seconds
  }
  
  connect() {
    console.log("Heartbeat controller connected with game ID:", this.gameIdValue)
    if (this.hasGameIdValue && !isNaN(this.gameIdValue) && this.gameIdValue > 0) {
      console.log("Starting heartbeat with interval:", this.intervalValue, "ms")
      this.startHeartbeat()
    } else {
      console.warn("No valid game ID for heartbeat:", this.gameIdValue)
    }
  }
  
  disconnect() {
    this.stopHeartbeat()
  }
  
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.intervalValue)
    
    // Send an initial heartbeat
    this.sendHeartbeat()
  }
  
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
  }
  
  sendHeartbeat() {
    if (!this.hasGameIdValue) {
      console.warn("Cannot send heartbeat without game ID")
      return
    }
    
    console.log("Sending heartbeat for game:", this.gameIdValue)
    
    // Get the CSRF token
    const token = this.getCSRFToken()
    
    if (!token) {
      console.warn("No CSRF token found, skipping heartbeat")
      return
    }
    
    // Create a form data object for the request
    const formData = new FormData()
    formData.append('authenticity_token', token)
    
    fetch(`/games/${this.gameIdValue}/heartbeat`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        console.log("Heartbeat sent successfully")
      } else {
        console.error("Heartbeat failed with status:", response.status)
      }
      return response
    })
    .catch(error => {
      console.error('Heartbeat error:', error)
      // If we get an error, slow down the heartbeat to prevent flooding with errors
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat()
      }, this.intervalValue * 3) // Triple the interval after an error
    })
  }
  
  getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!token) {
      console.error("Could not find CSRF token meta tag")
    }
    return token
  }
}
