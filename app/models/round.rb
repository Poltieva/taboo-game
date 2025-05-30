class Round < ApplicationRecord
  belongs_to :game
  belongs_to :giver, class_name: "User"
  belongs_to :word
  has_many :clues

  validates :word, presence: true

  def success!
    update(successful: true)
    # Update scores logic here
  end
end
