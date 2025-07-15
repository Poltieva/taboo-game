Rails.application.routes.draw do
  resources :word_lists
  resource :session
  resource :user, only: [ :new, :create ]
  resources :passwords, param: :token
  get "up" => "rails/health#show", as: :rails_health_check

  resources :games do
    member do
      post :start
      post :heartbeat
      get :players
    end
  end

  mount ActionCable.server => "/cable"

  # Route for serving sound files
  get "/sounds/:filename", to: redirect("/assets/sounds/%{filename}")

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "games#index"
end
