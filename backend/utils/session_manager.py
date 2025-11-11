from threading import Lock

class SessionManager:
    _instance = None
    _lock = Lock()

    def __init__(self):
        self.active_sessions = {}  # {usuario_id: token_jwt}

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def set_session(self, usuario_id, token):
        self.active_sessions[usuario_id] = token

    def get_session(self, usuario_id):
        return self.active_sessions.get(usuario_id)

    def invalidate_session(self, usuario_id):
        if usuario_id in self.active_sessions:
            del self.active_sessions[usuario_id]
