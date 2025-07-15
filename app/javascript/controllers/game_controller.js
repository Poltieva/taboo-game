import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static targets = ["playersList"]
  
  connect() {
    console.log("Game controller connected with game ID:", this.gameIdValue)
    
    if (this.hasGameIdValue) {
      console.log("Creating subscription for game:", this.gameIdValue)
      
      try {
        // Create a new consumer directly
        const consumer = createConsumer()
        this.channel = consumer.subscriptions.create(
          { channel: "GameChannel", game_id: this.gameIdValue },
          {
            connected: this._connected.bind(this),
            disconnected: this._disconnected.bind(this),
            received: this._received.bind(this),
            rejected: () => {
              console.error("Subscription was rejected!")
            }
          }
        )
        
        console.log("Subscription created:", this.channel)
        
        // If we're on a game page that shows the player list
        if (this.hasPlayersListTarget) {
          console.log("Player list found, refreshing soon...")
          // Force an immediate refresh to ensure we see the latest players
          setTimeout(() => {
            this.refreshPlayersList()
          }, 500)
        } else {
          console.warn("No players list target found!")
        }
        
        // Listen for refresh events
        this.boundRefreshHandler = () => this.refreshPlayersList()
        window.addEventListener('game:refresh-players', this.boundRefreshHandler)
      } catch (error) {
        console.error("Error creating subscription:", error)
      }
    } else {
      console.warn("No game ID value found!")
    }
    
    // Initialize sound button state
    const soundEnabled = localStorage.getItem('taboo_sound_enabled') !== 'false'
    this.updateSoundButtonState(soundEnabled)
  }
  
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
    }
    
    if (this.boundRefreshHandler) {
      window.removeEventListener('game:refresh-players', this.boundRefreshHandler)
    }
  }
  
  _connected() {
    console.log("Connected to game channel")
  }
  
  _disconnected() {
    console.log("Disconnected from game channel")
  }
  
  _received(data) {
    console.log("Received ActionCable message:", data)
    
    if (!data.type) {
      console.warn("Received message without type:", data)
      return
    }
    
    if (data.type === "player_joined") {
      console.log("Player joined:", data.player)
      if (!data.player) {
        console.error("Missing player data in player_joined message")
        return
      }
      this.addPlayer(data.player)
      // Play a sound effect for player joining
      this.playSound('join')
    } else if (data.type === "player_left") {
      console.log("Player left:", data.player_id)
      if (!data.player_id) {
        console.error("Missing player_id in player_left message")
        return
      }
      this.removePlayer(data.player_id)
      // Play a sound effect for player leaving
      this.playSound('leave')
    } else if (data.type === "game_started") {
      console.log("Game started")
      this.playSound('start')
      // Give a slight delay to allow the sound to play before reloading
      setTimeout(() => window.location.reload(), 500)
    } else if (data.type === "round_success") {
      console.log("Round success:", data)
      this.handleRoundSuccess(data)
    } else {
      console.warn("Unknown message type:", data.type)
    }
  }
  
  playSound(type) {
    console.log(`Playing sound effect: ${type}`)
    
    // Check if we should play sounds (based on user preference stored in localStorage)
    const soundEnabled = localStorage.getItem('taboo_sound_enabled') !== 'false'
    
    if (!soundEnabled) {
      console.log('Sounds are disabled by user preference')
      return
    }
    
    try {
      // Create a new audio instance
      const audio = new Audio(`/sounds/${type}.mp3`)
      
      // Set volume (0.0 to 1.0)
      audio.volume = 0.5
      
      // Play the sound
      audio.play().catch(error => {
        console.error(`Error playing ${type} sound:`, error)
      })
    } catch (error) {
      console.error(`Error setting up ${type} sound:`, error)
    }
  }
  
  addPlayer(player) {
    console.log("Adding player to UI:", player)
    
    if (!document.getElementById(`player-${player.id}`)) {
      const playerElement = document.createElement('div')
      playerElement.id = `player-${player.id}`
      playerElement.className = 'player-item'
      
      // Include creator badge if player is the creator
      let content = `<strong>${player.username}</strong>`
      if (player.is_creator) {
        content += `<span class="creator-badge">Creator</span>`
      }
      
      playerElement.innerHTML = content
      
      // Add animation class for a smooth entrance
      playerElement.classList.add('player-joined')
      setTimeout(() => playerElement.classList.remove('player-joined'), 1000)
      
      this.playersListTarget.appendChild(playerElement)
      
      // Update player count
      const playerCount = document.getElementById('player-count')
      if (playerCount) {
        const currentCount = parseInt(playerCount.textContent) || 0
        playerCount.textContent = currentCount + 1
      }
    } else {
      console.log("Player already exists in UI, skipping add")
    }
  }
  
  removePlayer(playerId) {
    console.log("Removing player from UI:", playerId)
    
    const playerElement = document.getElementById(`player-${playerId}`)
    if (playerElement) {
      // Add animation class for a smooth exit
      playerElement.classList.add('player-left')
      
      // Remove after animation completes
      setTimeout(() => {
        playerElement.remove()
        
        // Update player count
        const playerCount = document.getElementById('player-count')
        if (playerCount) {
          const currentCount = parseInt(playerCount.textContent) || 0
          playerCount.textContent = Math.max(0, currentCount - 1)
        }
      }, 500)
    } else {
      console.warn("Player element not found for removal:", playerId)
    }
  }
  
  handleRoundSuccess(data) {
    // Handle round success logic if needed
    console.log(`Round ${data.round_id} completed successfully with word: ${data.word}`)
  }
  
  refreshPlayersList() {
    console.log("Refreshing players list for game:", this.gameIdValue)
    if (!this.hasGameIdValue || !this.hasPlayersListTarget) {
      console.warn("Cannot refresh players: missing game ID or players list target")
      return
    }
    
    fetch(`/games/${this.gameIdValue}/players`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json()
      } else {
        throw new Error(`Server returned ${response.status}`)
      }
    })
    .then(data => {
      console.log("Received players data:", data)
      // Clear the current list
      this.playersListTarget.innerHTML = ''
      
      // Add all players
      data.players.forEach(player => {
        const playerElement = document.createElement('div')
        playerElement.id = `player-${player.id}`
        playerElement.className = 'player-item'
        
        let content = `<strong>${player.username}</strong>`
        if (player.is_creator) {
          content += `<span class="creator-badge">Creator</span>`
        }
        
        playerElement.innerHTML = content
        this.playersListTarget.appendChild(playerElement)
      })
      
      // Update player count
      const playerCount = document.getElementById('player-count')
      if (playerCount) {
        playerCount.textContent = data.players.length
      }
    })
    .catch(error => console.error('Error refreshing players:', error))
  }
  
  toggleSound(event) {
    // Get current sound state
    const soundEnabled = localStorage.getItem('taboo_sound_enabled') !== 'false'
    
    // Toggle sound state
    localStorage.setItem('taboo_sound_enabled', !soundEnabled)
    
    // Update button appearance
    this.updateSoundButtonState(!soundEnabled)
    
    // Prevent form submission
    event.preventDefault()
  }
  
  updateSoundButtonState(enabled) {
    const button = document.getElementById('toggle-sound')
    if (button) {
      const soundOn = button.querySelector('.sound-on')
      const soundOff = button.querySelector('.sound-off')
      
      if (enabled) {
        soundOn.style.display = ''
        soundOff.style.display = 'none'
      } else {
        soundOn.style.display = 'none'
        soundOff.style.display = ''
      }
    }
  }
  
  static values = {
    gameId: Number
  }
}
