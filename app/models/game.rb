class Game < ApplicationRecord
  has_many :games_players, dependent: :destroy
  has_many :players, through: :games_players, source: :player
  has_many :rounds, dependent: :destroy
  belongs_to :creator, class_name: "User"
  has_one :word_list, dependent: :destroy
  accepts_nested_attributes_for :word_list

  enum :status, { waiting: 0, in_progress: 1, finished: 2 }

  scope :in_progress, -> { where(status: :in_progress) }

  ROUND_DURATION = 3 # Round duration in seconds
  ROUND_PAUSE = 3 # Pause between rounds in seconds


  def start_game!
    update(status: :in_progress)
    create_rounds
    start_next_round if rounds.any?
  end

  def start_next_round
    update(current_round_order: current_round_order + 1)
    round = rounds.find_by(order: current_round_order)

    return false unless round

    # Activate the round
    round.update(status: :active, started_at: Time.current.utc)
    # Broadcast the round start event
    GameChannel.broadcast_to(self, {
      type: "round_started",
      round_id: round.id,
      player_id: round.player_id,
      player_name: round.player.username,
      word: round.word,
      duration: ROUND_DURATION,
    })

    true
  end

  def end_current_round
    round = current_round

    return false unless round

    # Mark the round as completed and store the next round time
    round.update(
      status: :completed
    )
    # Broadcast the round end event
    GameChannel.broadcast_to(self, {
      type: "round_ended",
      round_id: round.id,
      player_id: round.player_id,
      player_name: round.player.username,
      word: round.word,
      next_round_available_at: (Time.current + ROUND_PAUSE.seconds).iso8601
    })

    if game_over?
      finish_game
    end

    true
  end

  def game_over?
    !rounds_available? && !current_round
  end

  def finish_game
    update(status: :finished)
    GameChannel.broadcast_to(self, { type: "game_finished" })
  end

  def rounds_available?
    rounds.where("rounds.order > ?", current_round_order).any?
  end

  def current_round
    rounds.find_by(status: :active)
  end

  def next_round
    rounds.find_by(order: current_round_order + 1)
  end

  private

  def create_rounds
    (0..3).each do |i|
      rounds.create(player: players[i % players.count], word: word_list.words.sample, order: i)
    end
  end
end
