class Game < ApplicationRecord
  has_many :games_players
  has_many :players, through: :games_players, source: :player
  has_many :rounds
  belongs_to :creator, class_name: "User"
  has_one :word_list, dependent: :destroy
  accepts_nested_attributes_for :word_list

  enum :status, { waiting: 0, in_progress: 1, finished: 2 }


  def start_game!
    update(status: :in_progress)
    create_rounds
  end

  private


  def create_rounds
    3.times do
      rounds.create(player: players.sample, word: word_list.words.sample)
    end
  end
end
