class AddStatusAndTimingToRounds < ActiveRecord::Migration[8.0]
  def change
    add_column :rounds, :status, :integer, default: 0, null: false
    add_column :rounds, :started_at, :datetime
    add_column :rounds, :ends_at, :datetime
    add_column :rounds, :completed_at, :datetime

    add_index :rounds, :status
  end
end
