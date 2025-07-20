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

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "games#index"

  # For MP3 files in public/sounds directory
  get "/sounds/*path", to: lambda { |env|
    path = env["PATH_INFO"].sub("/sounds/", "")
    file_path = Rails.root.join("public", "sounds", path)

    if File.exist?(file_path)
      [
        200,
        {
          "Content-Type" => "audio/mpeg",
          "Content-Length" => File.size(file_path).to_s,
          "Cache-Control" => "public, max-age=86400"
        },
        [ File.read(file_path) ]
      ]
    else
      [ 404, { "Content-Type" => "text/plain" }, [ "File not found" ] ]
    end
  }
end
