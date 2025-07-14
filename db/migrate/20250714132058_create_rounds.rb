class CreateRounds < ActiveRecord::Migration[8.0]
  def change
    create_table :rounds do |t|
      t.references :game, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: { to_table: :users }
      t.string :word

      t.timestamps
    end
  end
end
