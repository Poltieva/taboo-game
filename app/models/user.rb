class User < ApplicationRecord
  has_many :player_games
  has_many :games, through: :player_games

  validates :username, presence: true, uniqueness: true
end
