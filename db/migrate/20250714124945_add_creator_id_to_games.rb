class AddCreatorIdToGames < ActiveRecord::Migration[8.0]
  def change
    add_reference :games, :creator, foreign_key: { to_table: :users }
  end
end
