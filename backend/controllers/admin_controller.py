# controllers/admin_controller.py
from models.base import db
from models.usuario import Usuario
from models.rol import Rol  # Para validar que el rol existe

class AdminController:
    
    @staticmethod
    def crear_usuario(data, current_user):
        """
        Crear usuarios (solo para admins/organizadores)
        """
        # Validaciones
        if not data.get('email') or not data.get('password') or not data.get('rol_id'):
            return {'msg': 'Email, contraseña y rol son obligatorios'}, 400

        # Verificar si el usuario ya existe
        if Usuario.query.filter_by(email=data['email']).first():
            return {'msg': 'El email ya existe'}, 409
        
        # Validar que el rol exista en la base de datos
        rol_existente = Rol.query.get(data['rol_id'])
        if not rol_existente:
            return {'msg': 'El rol especificado no existe'}, 400
        
        # Validar que el rol sea permitido según quién crea
        rol_permitidos = AdminController._get_roles_permitidos(current_user['rol_id'])
        if data['rol_id'] not in rol_permitidos:
            return {'msg': 'No tienes permisos para crear este rol'}, 403
        
        try:
            new_user = Usuario(
                email=data['email'],
                rol_id=data['rol_id'],
                estado_id=1  # Activo por defecto
            )
            
     
            new_user.set_password(data['password'])
            
            db.session.add(new_user)
            db.session.commit()
            
            return {
                'msg': 'Usuario creado exitosamente',
                'usuario_id': new_user.usuario_id,
                'email': new_user.email,
                'rol_id': new_user.rol_id
            }, 201

        except Exception as e:
            db.session.rollback()
            print(f"Error creando usuario: {str(e)}")
            return {'msg': 'Error interno del servidor'}, 500

    @staticmethod
    def _get_roles_permitidos(rol_creador):
        """
        Define qué roles puede crear cada tipo de usuario
        """
        roles_permitidos = {
            2: [1, 2, 3],  # Admin puede crear artesanos, admins y organizadores
            3: [1, 3]      # Organizador puede crear artesanos y organizadores
        }
        return roles_permitidos.get(rol_creador, [])