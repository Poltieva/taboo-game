class Game < ApplicationRecord
  has_many :games_players, dependent: :destroy
  has_many :players, through: :games_players, source: :player
  has_many :rounds, dependent: :destroy
  belongs_to :creator, class_name: "User"
  has_one :word_list, dependent: :destroy
  accepts_nested_attributes_for :word_list

  enum :status, { waiting: 0, in_progress: 1, finished: 2 }

  # Scope for games in progress
  scope :in_progress, -> { where(status: :in_progress) }

  # Round duration in seconds
  ROUND_DURATION = 3
  # Pause between rounds in seconds
  ROUND_PAUSE = 3

  def start_game!
    update(status: :in_progress)
    create_rounds
    start_next_round if rounds.any?
  end

  def current_round
    rounds.find_by(status: :active)
  end

  def next_round
    rounds.pending.order(created_at: :asc).first
  end

  def start_next_round
    # Find the next pending round
    round = next_round
    return false unless round

    # Activate the round
    round.update(status: :active, started_at: Time.current, ends_at: Time.current + ROUND_DURATION.seconds)

    # Broadcast the round start event
    GameChannel.broadcast_to(self, {
      type: "round_started",
      round_id: round.id,
      player_id: round.player_id,
      player_name: round.player.username,
      word: round.word,
      duration: ROUND_DURATION,
      ends_at: round.ends_at.iso8601
    })

    true
  end

  def end_current_round
    round = current_round
    return false unless round

    # Store next round available time in the database to keep it consistent across all clients
    next_round_available_at = Time.current + ROUND_PAUSE.seconds

    # Mark the round as completed and store the next round time
    round.update(
      status: :completed,
      completed_at: Time.current,
      next_round_at: next_round_available_at
    )

    # Broadcast the round end event
    GameChannel.broadcast_to(self, {
      type: "round_ended",
      round_id: round.id,
      player_id: round.player_id,
      player_name: round.player.username,
      word: round.word,
      next_round_available_at: next_round_available_at.iso8601
    })

    # Check if the game is over
    if game_over?
      # If there are no more rounds, end the game
      finish_game
    end

    true
  end

  def rounds_available?
    rounds.pending.exists?
  end

  def game_over?
    !rounds_available? && !current_round
  end

  def finish_game
    update(status: :finished)
    GameChannel.broadcast_to(self, { type: "game_finished" })
  end

  private

  def create_rounds
    return unless word_list

    # Get words from word list
    words = word_list.words
    return if words.empty?

    # Create rounds for each player
    (0..10).each do |i|
      players[i % players.size].tap do |player|
        rounds.create(
          player: player,
          word: words.sample,
          status: :pending
        )
      end
    end
  end
end
