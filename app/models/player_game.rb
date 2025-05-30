class PlayerGame < ApplicationRecord
  belongs_to :user
  belongs_to :game

  validates :score, presence: true, numericality: { only_integer: true }
end
