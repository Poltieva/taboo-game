class AddOrderToRounds < ActiveRecord::Migration[8.0]
  def change
    add_column :rounds, :order, :integer, null: false, default: 0
  end
end
