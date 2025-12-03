from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.usuario import Usuario
from models.administrador import Administrador 
from models.organizador import Organizador
from models.artesano import Artesano
from datetime import datetime

usuarios_bp = Blueprint('usuarios', __name__)

def get_usuario_actual():
    """Obtiene el usuario actual desde el token JWT"""
    user_identity = get_jwt_identity()  # "user_123"
    usuario_id = int(user_identity.split('_')[1])
    return Usuario.query.get(usuario_id)

@usuarios_bp.route('/crear', methods=['POST'])
@jwt_required()
def crear_usuario():
    try:
        data = request.get_json()

        required_fields = ['email', 'password', 'rol_id', 'nombre']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo {field} es requerido'}), 400

        # Obtener usuario actual desde el token
        usuario_creador = get_usuario_actual()
        if not usuario_creador:
            return jsonify({'error': 'Usuario no autenticado'}), 401
        
        # solo Organizadores pueden crear usuarios
        if usuario_creador.rol_id != 3:  
            return jsonify({'error': 'No tienes permisos para crear usuarios'}), 403
        
        # Validar rol del nuevo usuario
        rol_id = data['rol_id']
        if rol_id not in [2, 3]:  
            return jsonify({'error': 'Rol no valido'}), 400
        
        # Verificar si el email ya existe
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'El email ya está registrado'}), 400
        
        # Crear el usuario base (tabla Usuario)
        nuevo_usuario = Usuario(
            email=data['email'],
            estado_id=1, 
            rol_id=rol_id,
            fecha_registro=datetime.utcnow()
        )
        nuevo_usuario.set_password(data['password'])
        
        db.session.add(nuevo_usuario)
        db.session.flush()  # Para obtener el ID sin commit
        
        # Crear el perfil específico según el rol
        if rol_id == 2:  # Administrador
            administrador = Administrador(
                usuario_id=nuevo_usuario.usuario_id,
                nombre=data['nombre'],
                creado_por=usuario_creador.usuario_id
            )
            db.session.add(administrador)
        elif rol_id == 3:  # Organizador
            organizador = Organizador(
                usuario_id=nuevo_usuario.usuario_id,
                nombre=data['nombre'],
                creado_por=usuario_creador.usuario_id
            )
            db.session.add(organizador)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Usuario creado exitosamente',
            'usuario_id': nuevo_usuario.usuario_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al crear usuario: {str(e)}'}), 500

@usuarios_bp.route('/buscar/rol', methods=['GET'])
@jwt_required()
def buscar_usuarios_por_rol():
    try:
        rol_id = request.args.get('rol_id')
        
        if not rol_id:
            return jsonify({'error': 'El parámetro rol_id es requerido'}), 400
        
        usuarios = Usuario.query.filter_by(rol_id=rol_id).all()
        
        resultado = []
        for usuario in usuarios:
            usuario_data = usuario.to_dict()
            
            # Agregar información específica del perfil
            if usuario.rol_id == 2:  # Administrador
                admin = Administrador.query.filter_by(usuario_id=usuario.usuario_id).first()
                if admin:
                    usuario_data.update({
                        'nombre': admin.nombre,
                        'creado_por': admin.creado_por,
                        'activo': admin.activo,
                        'fecha_creacion': admin.fecha_creacion.isoformat() if admin.fecha_creacion else None,
                        'administrador_id': admin.administrador_id
                    })
            elif usuario.rol_id == 3:  # Organizador
                org = Organizador.query.filter_by(usuario_id=usuario.usuario_id).first()
                if org:
                    usuario_data.update({
                        'nombre': org.nombre,
                        'creado_por': org.creado_por,
                        'activo': org.activo,
                        'fecha_creacion': org.fecha_creacion.isoformat() if org.fecha_creacion else None,
                        'organizador_id': org.organizador_id
                    })
            
            resultado.append(usuario_data)
        
        return jsonify({'usuarios': resultado, 'total': len(resultado)}), 200
        
    except Exception as e:
        return jsonify({'error': f'Error al buscar usuarios: {str(e)}'}), 500

@usuarios_bp.route('/buscar/nombre', methods=['GET'])
@jwt_required()
def buscar_usuarios_por_nombre():
    """
    Buscar usuarios por nombre (en Administrador u Organizador)
    """
    try:
        nombre = request.args.get('nombre')
        
        if not nombre:
            return jsonify({'error': 'El parámetro nombre es requerido'}), 400
        
        resultado = []
        
        # Buscar en Administradores
        admins = Administrador.query.filter(
            Administrador.nombre.ilike(f'%{nombre}%')
        ).all()
        
        for admin in admins:
            usuario = Usuario.query.get(admin.usuario_id)
            if usuario:
                usuario_data = usuario.to_dict()
                usuario_data.update({
                    'nombre': admin.nombre,
                    'creado_por': admin.creado_por,
                    'activo': admin.activo,
                    'fecha_creacion': admin.fecha_creacion.isoformat() if admin.fecha_creacion else None,
                    'administrador_id': admin.administrador_id
                })
                resultado.append(usuario_data)
        
        # Buscar en Organizadores
        organizadores = Organizador.query.filter(
            Organizador.nombre.ilike(f'%{nombre}%')
        ).all()
        
        for org in organizadores:
            usuario = Usuario.query.get(org.usuario_id)
            if usuario:
                usuario_data = usuario.to_dict()
                usuario_data.update({
                    'nombre': org.nombre,
                    'creado_por': org.creado_por,
                    'activo': org.activo,
                    'fecha_creacion': org.fecha_creacion.isoformat() if org.fecha_creacion else None,
                    'organizador_id': org.organizador_id
                })
                resultado.append(usuario_data)
        
        return jsonify({'usuarios': resultado, 'total': len(resultado)}), 200
        
    except Exception as e:
        return jsonify({'error': f'Error al buscar usuarios: {str(e)}'}), 500

@usuarios_bp.route('/editar/<int:usuario_id>', methods=['PUT'])
@jwt_required()
def editar_usuario(usuario_id):
    try:
        data = request.get_json()
        
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Actualizar campos del usuario base (tabla Usuario)
        if 'email' in data and data['email'] != usuario.email:
            if Usuario.query.filter(Usuario.email == data['email'], Usuario.usuario_id != usuario_id).first():
                return jsonify({'error': 'El email ya está en uso'}), 400
            usuario.email = data['email']
        
        if 'password' in data:
            usuario.set_password(data['password'])
        
        if 'estado_id' in data:
            usuario.estado_id = data['estado_id']
        
        # Actualizar perfil específico según el rol
        if usuario.rol_id == 2:  # Administrador
            admin = Administrador.query.filter_by(usuario_id=usuario_id).first()
            if admin:
                if 'nombre' in data:
                    admin.nombre = data['nombre']
                if 'activo' in data:
                    admin.activo = data['activo']
        
        elif usuario.rol_id == 3:  # Organizador
            org = Organizador.query.filter_by(usuario_id=usuario_id).first()
            if org:
                if 'nombre' in data:
                    org.nombre = data['nombre']
                if 'activo' in data:
                    org.activo = data['activo']
        
        db.session.commit()
        
        return jsonify({'message': 'Usuario actualizado exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al actualizar usuario: {str(e)}'}), 500

@usuarios_bp.route('/eliminar/<int:usuario_id>', methods=['DELETE'])
@jwt_required()
def eliminar_usuario(usuario_id):
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        administrador_id = None
        if usuario.rol_id == 2:  
            admin = Administrador.query.filter_by(usuario_id=usuario_id).first()
            if admin:
                administrador_id = admin.administrador_id
                
                from models.solicitud import Solicitud
                solicitudes_count = Solicitud.query.filter_by(administrador_id=administrador_id).count()
                print(f"El administrador tiene {solicitudes_count} solicitud(es) que mantendrán la referencia")
        
        if usuario.rol_id == 2:
            admin = Administrador.query.filter_by(usuario_id=usuario_id).first()
            if admin:
                db.session.delete(admin)
        elif usuario.rol_id == 3:
            org = Organizador.query.filter_by(usuario_id=usuario_id).first()
            if org:
                db.session.delete(org)
        
        db.session.delete(usuario)
        db.session.commit()
        
        if administrador_id:
            from models.solicitud import Solicitud
            solicitudes_actualizadas = Solicitud.query.filter_by(administrador_id=administrador_id).all()
        
        return jsonify({
            'message': 'Usuario eliminado exitosamente',
            'detalle': 'Las solicitudes relacionadas mantienen su información pero sin administrador asignado'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error al eliminar usuario: {str(e)}'}), 500

@usuarios_bp.route('/<int:usuario_id>', methods=['GET'])
@jwt_required()
def obtener_usuario(usuario_id):
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        usuario_data = usuario.to_dict()

        if usuario.rol_id == 2:  # Administrador
            admin = Administrador.query.filter_by(usuario_id=usuario_id).first()
            if admin:
                usuario_data.update({
                    'nombre': admin.nombre,
                    'creado_por': admin.creado_por,
                    'activo': admin.activo,
                    'fecha_creacion': admin.fecha_creacion.isoformat() if admin.fecha_creacion else None,
                    'administrador_id': admin.administrador_id
                })
        elif usuario.rol_id == 3:  # Organizador
            org = Organizador.query.filter_by(usuario_id=usuario_id).first()
            if org:
                usuario_data.update({
                    'nombre': org.nombre,
                    'creado_por': org.creado_por,
                    'activo': org.activo,
                    'fecha_creacion': org.fecha_creacion.isoformat() if org.fecha_creacion else None,
                    'organizador_id': org.organizador_id
                })
        
        return jsonify(usuario_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Error al obtener usuario: {str(e)}'}), 500