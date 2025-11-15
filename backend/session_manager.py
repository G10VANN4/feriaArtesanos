# session_manager.py
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SessionManager:
    _instance = None
    _active_sessions = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionManager, cls).__new__(cls)
            cls._active_sessions = {}
            logger.info("🎯 SINGLETON INICIALIZADO")
        return cls._instance
    
    def login_user(self, user_id, user_data):
        """Agregar usuario a sesiones activas"""
        if user_id in self._active_sessions:
            logger.info(f"🚫 USUARIO {user_id} YA TIENE SESIÓN ACTIVA")
            return False
        
        self._active_sessions[user_id] = {
            'user_id': user_id,
            'email': user_data.get('email'),
            'rol_id': user_data.get('rol_id'),
            'login_time': datetime.now()
        }
        logger.info(f"✅ USUARIO {user_id} LOGUEADO. Sesiones: {len(self._active_sessions)}")
        return True
    
    def logout_user(self, user_id):
        """Remover usuario - ESTA ES LA CLAVE"""
        if user_id in self._active_sessions:
            del self._active_sessions[user_id]
            logger.info(f"✅ USUARIO {user_id} LOGOUT. Sesiones: {len(self._active_sessions)}")
            return True
        logger.warning(f"⚠️ Usuario {user_id} no encontrado para logout")
        return False
    
    def can_user_login(self, user_id):
        """Verificar si puede hacer login"""
        can_login = user_id not in self._active_sessions
        logger.info(f"🔍 LOGIN {user_id}: {'✅' if can_login else '🚫'} (Sesiones: {len(self._active_sessions)})")
        return can_login
    
    def force_clean_user(self, user_id):
        """FORZAR limpieza de usuario - NUEVO MÉTODO"""
        if user_id in self._active_sessions:
            del self._active_sessions[user_id]
            logger.info(f"🧹 USUARIO {user_id} LIMPIADO FORZOSAMENTE")
            return True
        return False
    
    def reset_sessions(self):
        self._active_sessions.clear()
        logger.info("🧹 TODAS las sesiones reseteadas")
    
    def debug_status(self):
        return {
            'active_sessions_count': len(self._active_sessions),
            'active_users': list(self._active_sessions.keys())
        }

session_manager = SessionManager()