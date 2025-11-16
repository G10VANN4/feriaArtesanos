from datetime import datetime, timedelta
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
            logger.info("🎯 SINGLETON INICIALIZADO CON GRACE PERIOD")
        return cls._instance
    
    def login_user(self, user_id, user_data):
        """Agregar usuario a sesiones activas"""
        # PRIMERO: Limpiar sesiones expiradas automáticamente
        self._cleanup_expired_sessions()
        
        if user_id in self._active_sessions:
            logger.info(f"🚫 USUARIO {user_id} YA TIENE SESIÓN ACTIVA")
            return False
        
        self._active_sessions[user_id] = {
            'user_id': user_id,
            'email': user_data.get('email'),
            'rol_id': user_data.get('rol_id'),
            'login_time': datetime.now(),
            'last_activity': datetime.now()  # Para trackear actividad
        }
        logger.info(f"✅ USUARIO {user_id} LOGUEADO. Sesiones: {len(self._active_sessions)}")
        return True
    
    def logout_user(self, user_id):
        """Remover usuario"""
        if user_id in self._active_sessions:
            del self._active_sessions[user_id]
            logger.info(f"✅ USUARIO {user_id} LOGOUT. Sesiones: {len(self._active_sessions)}")
            return True
        logger.warning(f"⚠️ Usuario {user_id} no encontrado para logout")
        return False
    
    def can_user_login(self, user_id):
        """Verificar si puede hacer login - CON GRACE PERIOD INTELIGENTE"""
        # Siempre limpiar expiradas primero
        self._cleanup_expired_sessions()
        
        # Si no hay sesión activa, PERMITIR
        if user_id not in self._active_sessions:
            logger.info(f"✅ USUARIO {user_id} PUEDE LOGIN - Sin sesión activa")
            return True
        
        session_data = self._active_sessions[user_id]
        last_activity = session_data['last_activity']
        time_since_activity = (datetime.now() - last_activity).total_seconds()
        
        # ✅ REGLA PRINCIPAL: Si no hay actividad por 60  segundos, PERMITIR re-login
        if time_since_activity > 60:  # 60 segundos sin actividad
            logger.info(f"✅ USUARIO {user_id} PUEDE LOGIN - Sesión inactiva ({time_since_activity:.0f}s)")
            # Auto-limpiar la sesión inactiva
            del self._active_sessions[user_id]
            return True
        
        # ❌ Si la sesión está activa (con actividad reciente), BLOQUEAR
        logger.info(f"🚫 USUARIO {user_id} BLOQUEADO - Sesión activa ({time_since_activity:.0f}s)")
        return False
    
    def update_activity(self, user_id):
        """Actualizar última actividad del usuario (se llama en cada request)"""
        if user_id in self._active_sessions:
            self._active_sessions[user_id]['last_activity'] = datetime.now()
    
    def _cleanup_expired_sessions(self):
        """Limpiar sesiones con más de 30 minutos sin actividad"""
        now = datetime.now()
        expired_users = []
        
        for user_id, session_data in self._active_sessions.items():
            last_activity = session_data['last_activity']
            if (now - last_activity).total_seconds() > 1800:  # 30 minutos
                expired_users.append(user_id)
        
        for user_id in expired_users:
            del self._active_sessions[user_id]
            logger.info(f"🧹 Sesión expirada limpiada: {user_id}")
    
    def force_clean_user(self, user_id):
        """FORZAR limpieza de usuario"""
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
            'active_users': list(self._active_sessions.keys()),
            'session_details': {
                user_id: {
                    'email': data['email'],
                    'login_time': data['login_time'].isoformat(),
                    'last_activity': data['last_activity'].isoformat(),
                    'inactive_seconds': (datetime.now() - data['last_activity']).total_seconds()
                }
                for user_id, data in self._active_sessions.items()
            }
        }

session_manager = SessionManager()