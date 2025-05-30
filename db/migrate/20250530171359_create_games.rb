class CreateGames < ActiveRecord::Migration[8.0]
  def change
    create_table :games do |t|
      t.integer :status, default: 0
      t.integer :round_time, default: 80
      t.timestamps
    end
  end
end
