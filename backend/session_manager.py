# session_manager.py
from datetime import datetime, timedelta
import logging
import atexit
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SessionManager:
    _instance = None
    _active_sessions = {}
    _session_file = "active_sessions.json"  # Para persistencia opcional
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionManager, cls).__new__(cls)
            cls._active_sessions = {}
            logger.info("🎯 SINGLETON INICIALIZADO - CON AUTO-RESET")
            
            # Auto-cleanup al iniciar
            cls._instance._cleanup_expired_sessions()
            
            # Registrar cleanup al salir
            atexit.register(cls._instance._save_sessions)
        return cls._instance
    
    def login_user(self, user_id, user_data):
        """Agregar usuario a sesiones activas"""
        # PRIMERO: Limpiar sesiones expiradas automáticamente
        self._cleanup_expired_sessions()
        
        # DEBUG: Mostrar sesiones actuales
        logger.info(f"🔍 SESIONES ANTES DE LOGIN: {list(self._active_sessions.keys())}")
        
        # ❌ SI YA EXISTE, NO PERMITIR - SIN IMPORTAR TIEMPO
        if user_id in self._active_sessions:
            logger.info(f"🚫 USUARIO {user_id} YA TIENE SESIÓN ACTIVA - Login bloqueado")
            return False
        
        self._active_sessions[user_id] = {
            'user_id': user_id,
            'email': user_data.get('email'),
            'rol_id': user_data.get('rol_id'),
            'login_time': datetime.now(),
            'last_activity': datetime.now()
        }
        logger.info(f"✅ USUARIO {user_id} LOGUEADO. Sesiones: {len(self._active_sessions)}")
        logger.info(f"🔍 SESIONES DESPUÉS DE LOGIN: {list(self._active_sessions.keys())}")
        return True
    
    def logout_user(self, user_id):
        """Remover usuario - MÁS ROBUSTO"""
        logger.info(f"🔍 INTENTANDO LOGOUT para user_id: {user_id}")
        logger.info(f"🔍 SESIONES ANTES DE LOGOUT: {list(self._active_sessions.keys())}")
        
        if user_id in self._active_sessions:
            del self._active_sessions[user_id]
            logger.info(f"✅ USUARIO {user_id} LOGOUT EXITOSO. Sesiones: {len(self._active_sessions)}")
            logger.info(f"🔍 SESIONES DESPUÉS DE LOGOUT: {list(self._active_sessions.keys())}")
            return True
        logger.warning(f"⚠️ Usuario {user_id} no encontrado para logout")
        return False
    
    def can_user_login(self, user_id):
        """Verificar si puede hacer login - BLOQUEO TOTAL SI EXISTE SESIÓN"""
        # PRIMERO: Limpiar sesiones expiradas automáticamente
        self._cleanup_expired_sessions()
        
        # DEBUG
        logger.info(f"🔍 CHECK LOGIN {user_id} - Sesiones actuales: {list(self._active_sessions.keys())}")
        
        # ❌ BLOQUEAR SI EXISTE LA SESIÓN - SIN IMPORTAR EL TIEMPO
        if user_id in self._active_sessions:
            logger.info(f"🚫 USUARIO {user_id} BLOQUEADO - Ya tiene sesión activa")
            return False
        
        # ✅ PERMITIR solo si NO existe sesión
        logger.info(f"✅ USUARIO {user_id} PUEDE LOGIN - Sin sesión activa")
        return True
    
    def update_activity(self, user_id):
        """Actualizar última actividad del usuario"""
        if user_id in self._active_sessions:
            self._active_sessions[user_id]['last_activity'] = datetime.now()
    
    def _cleanup_expired_sessions(self):
        """Limpiar sesiones con más de 10 minutos sin actividad (reducido)"""
        now = datetime.now()
        expired_users = []
        
        for user_id, session_data in self._active_sessions.items():
            last_activity = session_data['last_activity']
            if (now - last_activity).total_seconds() > 600:  # 10 minutos
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
        """Resetear TODAS las sesiones - MÁS AGRESIVO"""
        session_count = len(self._active_sessions)
        self._active_sessions.clear()
        logger.info(f"🧹 TODAS las {session_count} sesiones reseteadas")
        logger.info(f"🔍 SESIONES DESPUÉS DE RESET: {list(self._active_sessions.keys())}")
    
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
    
    def get_active_users_metrics(self):
        self._cleanup_expired_sessions()
    
        active_users = []
        for user_id, session_data in self._active_sessions.items():
            inactive_seconds = (datetime.now() - session_data['last_activity']).total_seconds()
            active_users.append({
                'user_id': user_id,
                'email': session_data['email'],
                'rol_id': session_data['rol_id'],
                'login_time': session_data['login_time'].isoformat(),
                'last_activity': session_data['last_activity'].isoformat(),
                'inactive_seconds': inactive_seconds,
                'status': 'active' if inactive_seconds < 60 else 'inactive'
            })
    
        return {
            'total_active': len(active_users),
            'active_users': active_users,
            'by_role': {
                'admin': len([u for u in active_users if u['rol_id'] == 2]),
                'artesano': len([u for u in active_users if u['rol_id'] == 1])
            }
        }
    
    def _save_sessions(self):
        """Guardar sesiones al salir (opcional)"""
        pass

session_manager = SessionManager()