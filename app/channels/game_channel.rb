class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find(params[:game_id])
    stream_for @game

    # Notify that this player is online
    return unless current_user

    # Add user to players if not already present
    unless @game.players.include?(current_user)
      @game.players << current_user
    end

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

  def guess(data)
    round = Round.find(data["round_id"])
    if data["guess"].downcase == round.word.name.downcase
      round.success!
      broadcast_success(round)
    end
  end

  private

  def broadcast_success(round)
    GameChannel.broadcast_to(round.game, {
      type: "round_success",
      round_id: round.id,
      word: round.word.name
    })
  end

  # def broadcast_clue(clue)
  #   ActionCable.server.broadcast(
  #     "game_#{clue.round.game_id}",
  #     type: 'new_clue',
  #     clue: clue.content,
  #     user: clue.user.username
  #   )
  # end
end
