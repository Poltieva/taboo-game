class Word < ApplicationRecord
  has_many :rounds

  def self.random_word
    order("RANDOM()").first
  end
end
