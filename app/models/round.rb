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

  def time_remaining
    return 0 unless active? && ends_at

    remaining = (ends_at - Time.current).to_i
    [ remaining, 0 ].max
  end

  def expired?
    active? && time_remaining <= 0
  end
end
