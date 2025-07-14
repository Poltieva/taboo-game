class GamesController < ApplicationController
  before_action :set_game, only: %i[ show edit update destroy join start ]
  def index
    @games = Game.where(status: [ :waiting, :in_progress ])
  end

  def show
    @players = @game.players
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

  def join
    @game.player_games.create(user: current_user, score: 0)
    redirect_to @game
  end

  def start
    @game.start_game!
    GameChannel.broadcast_to(@game, type: "game_started")
    redirect_to @game
  end

  private
  # Use callbacks to share common setup or constraints between actions.
  def set_game
    @game = Game.find(params.expect(:id))
  end

  # Only allow a list of trusted parameters through.
  def game_params
    params.fetch(:game, {}).permit(
      :words
    )
  end
end
