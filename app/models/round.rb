class Round < ApplicationRecord
  belongs_to :game
  belongs_to :player, class_name: "User"
  # belongs_to :word
  # has_many :clues

  validates :word, presence: true

  enum :status, { pending: 0, active: 1, completed: 2, skipped: 3 }

  scope :pending, -> { where(status: :pending) }
  scope :active, -> { where(status: :active) }
  scope :completed, -> { where(status: :completed) }

  def next_round
    return if last_round?

    game.rounds.find_by(order: order + 1)
  end

  def last_round?
    game.rounds.order(:order).last == self
  end
end
