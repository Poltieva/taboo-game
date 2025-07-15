class AddNextRoundAtToRounds < ActiveRecord::Migration[8.0]
  def change
    add_column :rounds, :next_round_at, :datetime
  end
end
