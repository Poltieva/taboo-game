class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find(params[:game_id])
    stream_for @game

    # Notify that this player is online
    return unless current_user

    # Add user to players if not already present
    unless @game.players.include?(current_user)
      @game.players << current_user

      # Broadcast player joined event
      GameChannel.broadcast_to(@game, {
        type: "player_joined",
        player: {
          id: current_user.id,
          username: current_user.username,
          is_creator: (@game.creator_id == current_user.id)
        }
      })
    end
  end

  def unsubscribed
    return unless current_user && @game

    # Only remove the player if we're in waiting status
    if @game.waiting?
      @game.players.delete(current_user)

      # Broadcast player left event
      GameChannel.broadcast_to(@game, {
        type: "player_left",
        player_id: current_user.id
      })
    end
  end

  # def give_clue(data)
  #   round = Round.find(data['round_id'])
  #   clue = round.clues.create(content: data['clue'], user: current_user)
  #   broadcast_clue(clue)
  # end

  private

  def broadcast_success(round)
    GameChannel.broadcast_to(round.game, {
      type: "round_success",
      round_id: round.id,
      word: round.word.name
    })
  end
end
