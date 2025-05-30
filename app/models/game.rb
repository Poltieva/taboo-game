class Game < ApplicationRecord
  has_many :player_games
  has_many :players, through: :player_games, source: :user
  has_many :rounds
  belongs_to :creator, class_name: "User", optional: true

  enum status: { waiting: 0, in_progress: 1, finished: 2 }

  def start_game!
    update(status: :in_progress)
    create_new_round
  end

  private

  def create_new_round
    rounds.create(
      giver: next_player,
      word: Word.random_word
    )
  end
end
