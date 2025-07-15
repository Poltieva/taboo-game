class GamesController < ApplicationController
  before_action :set_game, only: %i[ show edit update destroy start heartbeat players next_round end_round ]
  def index
    @games = Game.where(status: [ :waiting, :in_progress ])
  end

  def show
    unless @game.players.include?(current_user)
      @game.players << current_user
      # Don't broadcast here since the channel subscription will handle it
      flash[:notice] = "You have joined the game!"
    end
    @players = @game.players
    @current_user = current_user
    @current_round = @game.current_round
    @next_player = @game.next_round&.player
  end

  def new
    @game = Game.new
  end

  def edit
  end

  def create
    @game = Game.new(creator: current_user)
    @game.build_word_list(words: game_params[:words].split(",").map(&:strip))
    @game.players << current_user
    # @game.player_games.create(user: current_user, score: 0)

    if @game.save
      redirect_to @game, notice: "Game was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @game.update(game_params)
      redirect_to @game, notice: "Game was successfully updated.", status: :see_other
    else
      render :edit, status: :unprocessable_entity
    end
  end


  def destroy
    @game.destroy!
    redirect_to games_path, notice: "Game was successfully destroyed.", status: :see_other
  end

  def start
    @game.start_game!
    GameChannel.broadcast_to(@game, type: "game_started")
    redirect_to @game
  end

  def heartbeat
    # Update player's last_seen timestamp
    if @game && current_user && @game.players.include?(current_user)
      begin
        # Use Rails cache to track player activity
        Rails.cache.write("player:#{current_user.id}:game:#{@game.id}:active", true, expires_in: 1.minute)

        # Check for inactive players every 60 seconds to avoid excessive processing
        if rand < 0.1 # ~10% chance to run this code on each heartbeat
          check_inactive_players
        end

        respond_to do |format|
          format.json { head :ok }
          format.html { head :ok }
          format.any { head :ok }
        end
      rescue => e
        Rails.logger.error("Error in heartbeat: #{e.message}")
        head :internal_server_error
      end
    else
      head :not_found
    end
  end

  def players
    current_round = @game.current_round
    latest_completed_round = @game.rounds.where(status: :completed).order(completed_at: :desc).first

    respond_to do |format|
      format.json do
        render json: {
          players: @game.players.map { |p|
            {
              id: p.id,
              username: p.username,
              is_creator: (p.id == @game.creator_id),
              is_current_player: (current_round && current_round.player_id == p.id)
            }
          },
          current_round: current_round ? {
            id: current_round.id,
            player_id: current_round.player_id,
            word: current_round.word,
            ends_at: current_round.ends_at&.iso8601,
            time_remaining: current_round.time_remaining
          } : nil,
          next_round_info: latest_completed_round&.next_round_at ? {
            next_round_at: latest_completed_round.next_round_at.iso8601,
            seconds_until_next_round: [ (latest_completed_round.next_round_at - Time.current).to_i, 0 ].max
          } : nil,
          game_status: @game.status,
          rounds_available: @game.rounds_available?
        }
      end
    end
  end

  def next_round
    # Ensure the game is in progress
    return head :bad_request unless @game.in_progress?

    # Check if there's an active round - if so, we can't start a new one
    if @game.current_round
      respond_to do |format|
        format.html { redirect_to @game, alert: "A round is already in progress!" }
        format.json { render json: { status: "error", message: "A round is already in progress" }, status: :conflict }
        format.js { head :conflict }
      end
      return
    end

    # Start the next round
    if @game.start_next_round
      respond_to do |format|
        format.html { redirect_to @game, notice: "New round started!" }
        format.json { render json: { status: "success", message: "New round started" } }
        format.js { head :ok }
      end
    else
      # If there are no more rounds, end the game
      if !@game.rounds_available?
        @game.finish_game
        respond_to do |format|
          format.html { redirect_to @game, notice: "Game over! No more rounds available." }
          format.json { render json: { status: "game_over", message: "Game over! No more rounds available." } }
          format.js { head :ok }
        end
      else
        respond_to do |format|
          format.html { redirect_to @game, alert: "Could not start the next round." }
          format.json { render json: { status: "error", message: "Could not start the next round" }, status: :unprocessable_entity }
          format.js { head :unprocessable_entity }
        end
      end
    end
  end

  def end_round
    # Ensure the game is in progress and there's an active round
    return head :bad_request unless @game.in_progress? && @game.current_round

    # End the current round
    if @game.end_current_round
      respond_to do |format|
        format.html { redirect_to @game, notice: "Round ended!" }
        format.json { render json: { status: "success", message: "Round ended" } }
        format.js { head :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to @game, alert: "Could not end the round." }
        format.json { render json: { status: "error", message: "Could not end the round" }, status: :unprocessable_entity }
        format.js { head :unprocessable_entity }
      end
    end
  end

  private
  # Check for inactive players and remove them
  def check_inactive_players
    return unless @game&.waiting?

    @game.players.each do |player|
      # Skip the current user who we know is active
      next if player == current_user

      # Check if player is still active
      is_active = Rails.cache.exist?("player:#{player.id}:game:#{@game.id}:active")

      unless is_active
        # Player is inactive, remove them from the game
        @game.players.delete(player)

        # Broadcast that the player has left
        GameChannel.broadcast_to(@game, {
          type: "player_left",
          player_id: player.id
        })
      end
    end
  end

  # Use callbacks to share common setup or constraints between actions.
  def set_game
    @game = Game.find(params.fetch(:id))
  end

  # Only allow a list of trusted parameters through.
  def game_params
    params.fetch(:game, {}).permit(
      :words
    )
  end
end
