class GamesPlayer < ApplicationRecord
  belongs_to :player, class_name: "User"
  belongs_to :game

  # validates :score, presence: true, numericality: { only_integer: true }
end
