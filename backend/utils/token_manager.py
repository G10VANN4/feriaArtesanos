# utils/token_manager.py
from models.base import db
from models.active_token import ActiveToken
from models.token_blacklist import TokensBlacklist
from datetime import datetime, timezone, timedelta
import logging
import os

logger = logging.getLogger(__name__)

class TokenManager:
    
    @staticmethod
    def get_active_session(usuario_id):
        try:
            session = ActiveToken.query.filter_by(usuario_id=usuario_id).first()
            if session:
                logger.info(f" Sesión activa encontrada para usuario {usuario_id}: JTI={session.jti}, Expira={session.expires_at}")
            else:
                logger.info(f" No hay sesión activa para usuario {usuario_id}")
            return session
        except Exception as e:
            logger.error(f" Error crítico obteniendo sesión activa: {str(e)}")
            return None

    @staticmethod
    def terminate_active_session(usuario_id):
        """Termina la sesión activa de un usuario - MÁS ROBUSTO"""
        try:
            logger.info(f" TERMINATE_SESSION llamado para usuario: {usuario_id}")
            
            active_session = TokenManager.get_active_session(usuario_id)

            if not active_session:
                logger.info(f" No se encontró sesión activa para usuario {usuario_id}")
                return True  

            logger.info(f" Sesión activa encontrada - JTI: {active_session.jti}")
            
            
            already_blacklisted = TokensBlacklist.query.filter_by(
                jti=active_session.jti
            ).first()
            
            if already_blacklisted:
                logger.info(f" JTI {active_session.jti} ya está en blacklist")
            else:
                
                token_for_blacklist = TokensBlacklist(
                    jti=active_session.jti,
                    usuario_id=active_session.usuario_id,
                    expires_at=active_session.expires_at
                )
                db.session.add(token_for_blacklist)
                logger.info(f" Token {active_session.jti} movido a blacklist")

           
            db.session.delete(active_session)
            db.session.commit()
            
            logger.info(f" Sesión terminada exitosamente para usuario {usuario_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f" ERROR CRÍTICO en terminate_active_session: {str(e)}")
            import traceback
            logger.error(f"TRACEBACK: {traceback.format_exc()}")
            return False

    @staticmethod
    def add_active_session(usuario_id, jti, expires_at):
        try:
            logger.info(f"ADD_ACTIVE_SESSION - Usuario: {usuario_id}, JTI: {jti}")
            
            TokenManager.terminate_active_session(usuario_id)
            
         
            new_active_token = ActiveToken(
                usuario_id=usuario_id,
                jti=jti,
                expires_at=expires_at
            )
            db.session.add(new_active_token)
            db.session.commit()
            
            logger.info(f" Nueva sesión activa agregada para usuario {usuario_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f" ERROR en add_active_session: {str(e)}")
            return False

    @staticmethod
    def is_token_revoked(jti):
        """Verifica si un token está en la lista negra"""
        try:
            if not jti:
                return True
                
            blacklisted = TokensBlacklist.query.filter_by(jti=jti).first()
            
            if blacklisted:
                logger.info(f" Token {jti} está revocado")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f" Error verificando token revocado {jti}: {str(e)}")
            return True  

    @staticmethod
    def cleanup_expired_tokens():
        """Limpia tokens expirados - MÁS AGRESIVO EN DESARROLLO"""
        try:
            current_time = datetime.now(timezone.utc)
            logger.info(f" Limpiando tokens expirados a las {current_time}")
            
            
            expired_active = ActiveToken.query.filter(
                ActiveToken.expires_at < current_time
            ).delete()
            
            
            if os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') == '1':
                one_day_ago = current_time - timedelta(days=1)
                old_active = ActiveToken.query.filter(
                    ActiveToken.created_at < one_day_ago
                ).delete()
                logger.info(f" Desarrollo: {old_active} tokens antiguos eliminados")
            
          
            expired_blacklist = TokensBlacklist.query.filter(
                TokensBlacklist.expires_at < current_time
            ).delete()
            
            db.session.commit()
            
            logger.info(f" Limpieza: {expired_active} tokens activos y {expired_blacklist} tokens blacklist expirados eliminados")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f" Error en cleanup de tokens: {str(e)}")
            return False

    @staticmethod
    def get_active_users_metrics():
        try:
            TokenManager.cleanup_expired_tokens()

            from models.usuario import Usuario
            
            active_sessions = ActiveToken.query.all()
            active_user_ids = [session.usuario_id for session in active_sessions]
            
            if not active_user_ids:
                return {
                    'total_active': 0,
                    'active_users': [],
                    'by_role': {'admin': 0, 'artesano': 0}
                }

            active_users = Usuario.query.filter(Usuario.usuario_id.in_(active_user_ids)).all()
            
            active_users_list = []
            admin_count = 0
            artesano_count = 0

            for user in active_users:
                if user.rol_id == 2:
                    admin_count += 1
                elif user.rol_id == 1:
                    artesano_count += 1
                active_session = next((s for s in active_sessions if s.usuario_id == user.usuario_id), None)
                
                if active_session:
                    inactive_seconds = (datetime.now(timezone.utc) - active_session.created_at).total_seconds()
                    
                    active_users_list.append({
                        'user_id': user.usuario_id,
                        'email': user.email,
                        'rol_id': user.rol_id,
                        'login_time': active_session.created_at.isoformat(),
                        'last_activity': active_session.created_at.isoformat(),  # Usamos created_at como última actividad
                        'inactive_seconds': inactive_seconds,
                        'status': 'active' if inactive_seconds < 300 else 'inactive'  # 5 minutos de inactividad
                    })

            return {
                'total_active': len(active_users_list),
                'active_users': active_users_list,
                'by_role': {
                    'admin': admin_count,
                    'artesano': artesano_count
                }
            }
            
        except Exception as e:
            logger.error(f" Error obteniendo métricas de usuarios activos: {str(e)}")
            return {'total_active': 0, 'by_role': {'admin': 0, 'artesano': 0}, 'active_users': []}

    @staticmethod
    def can_user_login(usuario_id):
        """Verifica si un usuario puede hacer login (no tiene sesión activa)"""
        try:
            TokenManager.cleanup_expired_tokens()
            
            active_session = TokenManager.get_active_session(usuario_id)
            
            if active_session:
                logger.info(f" Usuario {usuario_id} ya tiene sesión activa - JTI: {active_session.jti}")
                logger.info(f" Creado: {active_session.created_at}, Expira: {active_session.expires_at}")
                return False
                
            logger.info(f" Usuario {usuario_id} puede hacer login - Sin sesiones activas")
            return True
            
        except Exception as e:
            logger.error(f" Error en can_user_login: {str(e)}")
            return True  

    @staticmethod
    def debug_all_active_sessions():
        try:
            from models.usuario import Usuario
            
            active_sessions = ActiveToken.query.all()
            result = []
            
            for session in active_sessions:
                user = Usuario.query.get(session.usuario_id)
                result.append({
                    'usuario_id': session.usuario_id,
                    'email': user.email if user else 'Usuario no encontrado',
                    'jti': session.jti,
                    'created_at': session.created_at.isoformat(),
                    'expires_at': session.expires_at.isoformat(),
                    'is_expired': session.expires_at < datetime.now(timezone.utc)
                })
            
            return result
            
        except Exception as e:
            logger.error(f" Error en debug_all_active_sessions: {str(e)}")
            return []

    @staticmethod
    def nuclear_reset_sessions():
        """Limpia TODAS las sesiones activas - SOLO PARA DESARROLLO"""
        try:
            count_before = ActiveToken.query.count()
            
            ActiveToken.query.delete()
            
            TokensBlacklist.query.delete()
            
            db.session.commit()
            
            logger.info(f" RESET NUCLEAR: {count_before} sesiones eliminadas")
            return count_before
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error en nuclear_reset_sessions: {str(e)}")
            return 0