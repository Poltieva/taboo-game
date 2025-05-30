Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  resources :games do
    member do
      post :join
      post :start
    end
  end

  mount ActionCable.server => "/cable"

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "games#index"
end
