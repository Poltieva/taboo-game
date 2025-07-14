class GameChannel < ApplicationCable::Channel
  def subscribed
    @game = Game.find(params[:game_id])
    stream_for @game
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

  # def broadcast_clue(clue)
  #   ActionCable.server.broadcast(
  #     "game_#{clue.round.game_id}",
  #     type: 'new_clue',
  #     clue: clue.content,
  #     user: clue.user.username
  #   )
  # end
end
