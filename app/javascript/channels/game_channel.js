// Load the ActionCable consumer from rails-ujs
import consumer from "@rails/actioncable"

// This file creates a consumer connection to the server-side GameChannel
consumer.subscriptions.create("GameChannel", {
  // Called when the subscription is ready for use on the server
  connected() {
    console.log("Connected to the game channel!");
  },

  // Called when the subscription has been terminated by the server
  disconnected() {
    console.log("Disconnected from the game channel!");
  },

  // Called when there's incoming data on the websocket for this channel
  received(data) {
    console.log("Received data:", data);
  }
});
