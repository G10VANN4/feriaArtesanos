from models.base import db
from models.active_token import ActiveToken
from models.token_blacklist import TokensBlacklist

class TokenManager:
    
    @staticmethod
    def get_active_session(usuario_id):
        """Obtiene la sesión activa de un usuario"""
        try:
            return db.session.query(ActiveToken).filter(
                ActiveToken.usuario_id == usuario_id
            ).first()
        except Exception as e:
            print(f"❌ Error obteniendo sesión activa para usuario {usuario_id}: {str(e)}")
            return None

    @staticmethod
    def terminate_active_session(usuario_id):
        """Termina la sesión activa de un usuario"""
        try:
            print(f"🛑 TERMINATE_SESSION called for user: {usuario_id}")
            
            active_session = TokenManager.get_active_session(usuario_id)

            if not active_session:
                print(f"❌ No active session found for user {usuario_id}")
                return False

            print(f"🔍 Found active session - JTI: {active_session.jti}")
            
            # Verificar si ya está en blacklist
            already_blacklisted = db.session.query(TokensBlacklist).filter(
                TokensBlacklist.jti == active_session.jti
            ).first()
            
            if already_blacklisted:
                print(f"⚠️ JTI {active_session.jti} already in blacklist")

            # Mover a lista negra
            token_for_blacklist = TokensBlacklist(
                jti=active_session.jti,
                usuario_id=active_session.usuario_id,
                expires_at=active_session.expires_at
            )

            db.session.add(token_for_blacklist)
            db.session.delete(active_session)
            db.session.commit()
            
            print(f"✅ Session terminated - JTI {active_session.jti} moved to blacklist")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ ERROR in terminate_active_session: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    @staticmethod
    def add_active_session(usuario_id, jti, expires_at):
        """Agrega un nuevo token activo para el usuario"""
        try:
            print(f"➕ ADD_ACTIVE_SESSION - User: {usuario_id}, JTI: {jti}")
            
            # Eliminar token activo existente si hay uno
            active_token = TokenManager.get_active_session(usuario_id)
            
            if active_token:
                print(f"🗑️ Removing existing active token: {active_token.jti}")
                db.session.delete(active_token)
            
            # Crear nuevo token activo
            new_active_token = ActiveToken(
                usuario_id=usuario_id,
                jti=jti,
                expires_at=expires_at
            )
            db.session.add(new_active_token)
            db.session.commit()
            
            print(f"✅ New active session added for user {usuario_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ ERROR in add_active_session: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    @staticmethod
    def is_token_revoked(jti):
        """Verifica si un token está en la lista negra"""
        try:
            if not jti:
                return True
                
            blacklisted = db.session.query(TokensBlacklist).filter(
                TokensBlacklist.jti == jti
            ).first()
            
            return blacklisted is not None
            
        except Exception as e:
            print(f"❌ Error verificando token revocado {jti}: {str(e)}")
            return True  # Por seguridad, asumir que está revocado si hay error

    @staticmethod
    def cleanup_expired_tokens():
        """Limpia tokens expirados (puedes ejecutar esto periódicamente)"""
        try:
            from datetime import datetime
            
            current_time = datetime.utcnow()
            print(f"🧹 Cleaning up expired tokens at {current_time}")
            
            # Eliminar active_tokens expirados
            expired_active = db.session.query(ActiveToken).filter(
                ActiveToken.expires_at < current_time
            ).delete()
            
            # Eliminar tokens blacklist expirados (opcional, podrías querer mantener historial)
            expired_blacklist = db.session.query(TokensBlacklist).filter(
                TokensBlacklist.expires_at < current_time
            ).delete()
            
            db.session.commit()
            
            print(f"✅ Cleanup: {expired_active} active tokens y {expired_blacklist} blacklist tokens expirados eliminados")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error en cleanup de tokens: {str(e)}")
            return False