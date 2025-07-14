class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :git, with: ->(e) { e.strip.downcase }
  has_many :player_games
  has_many :games, through: :player_games

  validates :username, presence: true, uniqueness: true
end
