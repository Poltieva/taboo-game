class CreateWordLists < ActiveRecord::Migration[8.0]
  def change
    create_table :word_lists do |t|
      t.references :game, null: false, foreign_key: true
      t.json :words
      t.string :name

      t.timestamps
    end
  end
end
