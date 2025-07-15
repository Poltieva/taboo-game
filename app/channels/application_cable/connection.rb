module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      logger.info "Attempting to connect to ActionCable"
      if set_current_user
        logger.info "Connected to ActionCable as user: #{current_user.username} (#{current_user.id})"
      else
        logger.error "Failed to connect to ActionCable - no authenticated user found"
        reject_unauthorized_connection
      end
    end

    private
      def set_current_user
        if session = Session.find_by(id: cookies.signed[:session_id])
          self.current_user = session.user
          logger.info "Found session and user: #{session.id}, #{current_user.username}"
          true
        else
          logger.warn "No session found with ID: #{cookies.signed[:session_id].inspect}"
          false
        end
      end
  end
end
