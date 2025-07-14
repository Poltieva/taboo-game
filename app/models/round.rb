class Round < ApplicationRecord
  belongs_to :game
  belongs_to :payer, class_name: "User"
  # belongs_to :word
  # has_many :clues

  validates :word, presence: true
end
