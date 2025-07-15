import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static targets = ["playersList", "roundTimer", "gameStatus", "roundMessages"]
  static values = {
    gameId: Number,
    roundDuration: { type: Number, default: 60 },
    pauseDuration: { type: Number, default: 10 }
  }
  
  connect() {
    console.log("Game controller connected with game ID:", this.gameIdValue)
    
    // Store round timer reference
    this.roundTimerInterval = null
    this.roundEndTime = null
    this.nextRoundCountdownInterval = null
    
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
          
          // Set up a periodic refresh every 5 seconds to keep the player list
          // and current player indicator in sync
          this.playerListInterval = setInterval(() => {
            this.refreshPlayersList()
          }, 5000)
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
    
    // Initialize timers based on server data instead of local calculation
    this.fetchRoundTimingInfo()
  }
  
  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
    }
    
    if (this.boundRefreshHandler) {
      window.removeEventListener('game:refresh-players', this.boundRefreshHandler)
    }
    
    // Clear any intervals
    if (this.playerListInterval) {
      clearInterval(this.playerListInterval)
    }
    
    if (this.roundTimerInterval) {
      clearInterval(this.roundTimerInterval)
    }
    
    if (this.nextRoundCountdownInterval) {
      clearInterval(this.nextRoundCountdownInterval)
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
    } else if (data.type === "round_started") {
      console.log("Round started:", data)
      this.handleRoundStarted(data)
    } else if (data.type === "round_ended") {
      console.log("Round ended:", data)
      this.handleRoundEnded(data)
    } else if (data.type === "game_finished") {
      console.log("Game finished")
      this.handleGameFinished()
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
    
    // Make sure we have a valid sound type
    if (!['join', 'leave', 'start'].includes(type)) {
      console.error(`Invalid sound type: ${type}`)
      return
    }
    
    try {
      // Create audio element for better browser compatibility
      const audio = new Audio()
      
      // Set the sound URL using window.location.origin to ensure absolute path
      const soundUrl = `${window.location.origin}/sounds/${type}.mp3`
      console.log(`Loading sound from: ${soundUrl}`)
      
      // Set up event listeners for debugging
      audio.addEventListener('canplaythrough', () => {
        console.log(`Sound ${type} loaded successfully and can play`)
        // Only try to play after the canplaythrough event
        try {
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error(`Error playing ${type} sound:`, error)
              this.playFallbackSound()
            })
          }
        } catch (innerError) {
          console.error(`Error playing sound after load: ${innerError}`)
          this.playFallbackSound()
        }
      })
      
      audio.addEventListener('error', (e) => {
        console.error(`Sound ${type} failed to load:`, e)
        this.playFallbackSound()
      })
      
      // Set audio properties
      audio.src = soundUrl
      audio.volume = 0.5
      audio.preload = 'auto'
      
    } catch (error) {
      console.error(`Error setting up ${type} sound:`, error)
      this.playFallbackSound()
    }
  }
  
  playFallbackSound() {
    // Simple beep using the Web Audio API as a fallback
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // value in hertz
      oscillator.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (e) {
      console.error('Could not play fallback sound:', e)
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
    
    // Add a message to the round messages
    this.addRoundMessage(`Round completed successfully! Word: ${data.word}`, 'round-ended')
  }
  
  handleRoundStarted(data) {
    console.log("Round started:", data)
    
    // Play a sound
    this.playSound('start')
    
    // Update the UI with a message
    this.addRoundMessage(`Round started with player ${data.player_name}`, 'round-started')
    
    // Either reload the page or fetch the latest timing info
    if (this.hasGameStatusTarget) {
      // If we're on the game page, reload to show the new round
      window.location.reload()
    } else {
      // Otherwise, just fetch the latest timing info
      this.fetchRoundTimingInfo()
    }
  }
  
  handleRoundEnded(data) {
    console.log("Round ended:", data)
    
    // Play a sound
    this.playSound('leave')
    
    // Clear any existing timer
    this.clearRoundTimer()
    
    // Update the UI
    this.addRoundMessage(`Round with ${data.player_name} has ended. Word was: ${data.word}`, 'round-ended')
    
    // Instead of calculating our own time, fetch the latest timing info from the server
    setTimeout(() => {
      this.fetchRoundTimingInfo()
    }, 500) // Small delay to ensure the server has processed the round end
  }
  
  handleGameFinished() {
    console.log("Game finished")
    
    // Play a sound
    this.playSound('leave')
    
    // Update the UI
    this.addRoundMessage("Game is finished! All rounds completed.", 'game-finished')
    
    // Refresh the page after a delay
    setTimeout(() => window.location.reload(), 1000)
  }
  
  startRoundTimer(duration, endTime) {
    // Clear any existing timer
    this.clearRoundTimer()
    
    // Store the end time
    this.roundEndTime = endTime
    
    // Update timer display immediately
    this.updateTimerDisplay()
    
    // Set up interval to update timer
    this.roundTimerInterval = setInterval(() => this.updateTimerDisplay(), 1000)
  }
  
  updateTimerDisplay() {
    if (!this.roundEndTime || !this.hasRoundTimerTarget) return
    
    // Calculate remaining time
    const now = new Date()
    const endTime = new Date(this.roundEndTime)
    const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000))
    
    // Format as MM:SS
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    // Update the timer display
    this.roundTimerTarget.textContent = formattedTime
    
    // Add urgent class when time is running low (less than 10 seconds)
    if (timeRemaining <= 10) {
      this.roundTimerTarget.classList.add('urgent')
    } else {
      this.roundTimerTarget.classList.remove('urgent')
    }
    
    // If time is up, clear the timer and end the round
    if (timeRemaining <= 0) {
      this.clearRoundTimer()
      this.endRoundAutomatically()
    }
  }
  
  clearRoundTimer() {
    if (this.roundTimerInterval) {
      clearInterval(this.roundTimerInterval)
      this.roundTimerInterval = null
    }
  }
  
  endRoundAutomatically() {
    // Don't end the round if it's already been handled
    if (this.roundEndingInProgress) return
    
    this.roundEndingInProgress = true
    console.log("Timer expired, ending round automatically")
    
    // Show a message that time is up
    this.addRoundMessage("Time's up! Round ended automatically.", 'round-ended')
    
    // Play the end sound
    this.playSound('leave')
    
    // Send the end round request to the server
    fetch(`/games/${this.gameIdValue}/end_round`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.getCsrfToken(),
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(response => {
      if (response.ok) {
        console.log("Round ended successfully via API")
        
        // After ending the round, start the pause timer
        this.startRoundPause()
        
        // Mark round ending as complete
        this.roundEndingInProgress = false
      } else {
        console.error("Error ending round:", response.status)
        this.roundEndingInProgress = false
      }
    })
    .catch(error => {
      console.error("Failed to end round:", error)
      this.roundEndingInProgress = false
    })
  }
  
  startRoundPause() {
    console.log("Starting round pause")
    
    // Instead of calculating our own time, fetch the latest timing info from the server
    this.fetchRoundTimingInfo()
  }
  
  fetchRoundTimingInfo() {
    fetch(`/games/${this.gameIdValue}/players`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (!data) return
      
      console.log("Received game timing data:", data)
      
      // Handle active round timer if there is one
      if (data.current_round && data.current_round.ends_at) {
        const endTime = new Date(data.current_round.ends_at)
        if (this.hasRoundTimerTarget) {
          console.log("Starting round timer with end time:", endTime)
          this.startRoundTimer(data.current_round.time_remaining, endTime)
        }
      }
      // Handle pause between rounds if there is one
      else if (data.next_round_info && data.next_round_info.next_round_at) {
        const nextRoundTime = new Date(data.next_round_info.next_round_at)
        const secondsUntilNextRound = data.next_round_info.seconds_until_next_round
        
        console.log(`Next round starts in ${secondsUntilNextRound} seconds at ${nextRoundTime}`)
        
        // Start countdown to next round
        this.startNextRoundCountdown(nextRoundTime, true)
      }
      // If game is in progress but no active round or pending round, try to start next round
      else if (data.game_status === 'in_progress' && data.rounds_available) {
        console.log("No active round or countdown, but rounds are available. Trying to start next round.")
        this.startNextRoundAutomatically()
      }
    })
    .catch(error => console.error("Error fetching round timing info:", error))
  }
  
  startNextRoundAutomatically() {
    console.log("Pause complete, starting next round automatically")
    
    // Send request to start the next round
    fetch(`/games/${this.gameIdValue}/next_round`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.getCsrfToken(),
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(response => {
      if (response.ok) {
        console.log("Next round started successfully via API")
        window.location.reload()
      } else if (response.status === 409) {
        console.log("A round is already in progress")
        window.location.reload()
      } else {
        console.error("Error starting next round:", response.status)
      }
    })
    .catch(error => {
      console.error("Failed to start next round:", error)
    })
  }
  
  getCsrfToken() {
    // Get CSRF token from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    return metaTag ? metaTag.content : ''
  }
  
  addRoundMessage(message, className = '') {
    if (!this.hasRoundMessagesTarget) return
    
    const messageElement = document.createElement('div')
    messageElement.className = `round-message ${className}`
    messageElement.textContent = message
    
    // Add to the beginning of the list
    if (this.roundMessagesTarget.firstChild) {
      this.roundMessagesTarget.insertBefore(messageElement, this.roundMessagesTarget.firstChild)
    } else {
      this.roundMessagesTarget.appendChild(messageElement)
    }
    
    // Only keep the last 5 messages
    const messages = this.roundMessagesTarget.querySelectorAll('.round-message')
    if (messages.length > 5) {
      this.roundMessagesTarget.removeChild(messages[messages.length - 1])
    }
  }
  
  startNextRoundCountdown(nextRoundTime, autoStart = false) {
    // Clear any existing countdown
    this.clearNextRoundCountdown()
    
    const countdownElement = document.getElementById('next-round-countdown')
    if (!countdownElement) return
    
    // Store whether to auto-start next round
    this.shouldAutoStartNextRound = autoStart
    
    // Update countdown immediately
    this.updateNextRoundCountdown(nextRoundTime, countdownElement)
    
    // Set up interval to update countdown
    this.nextRoundCountdownInterval = setInterval(() => {
      this.updateNextRoundCountdown(nextRoundTime, countdownElement)
    }, 1000)
  }
  
  updateNextRoundCountdown(nextRoundTime, countdownElement) {
    // Calculate seconds until next round
    const now = new Date()
    const secondsRemaining = Math.max(0, Math.floor((nextRoundTime - now) / 1000))
    
    // Update the countdown display
    countdownElement.textContent = secondsRemaining
    
    // If time is up
    if (secondsRemaining <= 0) {
      this.clearNextRoundCountdown()
      
      // If we should auto-start the next round, do so
      if (this.shouldAutoStartNextRound) {
        this.startNextRoundAutomatically()
      }
    }
  }
  
  clearNextRoundCountdown() {
    if (this.nextRoundCountdownInterval) {
      clearInterval(this.nextRoundCountdownInterval)
      this.nextRoundCountdownInterval = null
    }
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
      
      // Store current round info
      this.currentRoundData = data.current_round
      
      // Add all players
      data.players.forEach(player => {
        const playerElement = document.createElement('div')
        playerElement.id = `player-${player.id}`
        
        // Add current-player class if this is the player for the current round
        const classes = ['player-item']
        if (player.is_current_player) {
          classes.push('current-player')
        }
        playerElement.className = classes.join(' ')
        
        // Build content with username and badges
        let content = `<strong>${player.username}</strong>`
        if (player.is_creator) {
          content += `<span class="creator-badge">Creator</span>`
        }
        if (player.is_current_player) {
          content += `<span class="current-player-badge">Current Player</span>`
        }
        
        playerElement.innerHTML = content
        this.playersListTarget.appendChild(playerElement)
      })
      
      // Update player count
      const playerCount = document.getElementById('player-count')
      if (playerCount) {
        playerCount.textContent = data.players.length
      }
      
      // If we have round timer target and current round data with an end time,
      // make sure the timer is updated
      if (this.hasRoundTimerTarget && data.current_round && data.current_round.ends_at) {
        this.startRoundTimer(60, new Date(data.current_round.ends_at))
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
  
  // Static values already defined at the top of the class
}
