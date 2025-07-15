class NextRoundJob < ApplicationJob
  queue_as :default

  def perform(game_id)
    # Find the game
    game = Game.find_by(id: game_id)

    # Don't do anything if the game doesn't exist or is not in progress
    return unless game && game.in_progress?

    # Don't start a new round if one is already active
    return if game.current_round

    # Start the next round if available
    game.start_next_round
  end
end
