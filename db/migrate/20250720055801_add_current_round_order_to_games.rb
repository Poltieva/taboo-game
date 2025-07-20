class AddCurrentRoundOrderToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :current_round_order, :integer, default: -1
  end
end
