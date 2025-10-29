# controllers/solicitud_controller.py - CORREGIDO Y MEJORADO
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.solicitud import Solicitud
from models.artesano import Artesano
from models.rubro import Rubro
from models.estado_solicitud import EstadoSolicitud
from models.solicitud_foto import SolicitudFoto 
from datetime import datetime

# Crear blueprint directamente
solicitud_bp = Blueprint('solicitud_bp', __name__, url_prefix='/solicitudes')

@solicitud_bp.route('', methods=['POST'])
@jwt_required()
def crear_solicitud():
    """
    ENDPOINT UNIFICADO:
    Crea perfil y solicitud en una sola operación
    con control de duplicados y validaciones de negocio.
    """
    from traceback import format_exc

    try:
        current_user = get_jwt_identity()
        data = request.get_json() or {}

        print("DEBUG - Usuario autenticado:", current_user)
        print("DEBUG - Datos recibidos:", {k: (v if k != 'fotos' else f"{len(v)} imágenes") for k, v in data.items()})

        # Validación de usuario
        if not isinstance(current_user, dict) or 'rol_id' not in current_user:
            return jsonify({'msg': 'Error de autenticación: el token no contiene información de rol.', 'error': str(current_user)}), 401
        
        if current_user['rol_id'] != 1:
            return jsonify({'msg': 'Solo artesanos pueden crear solicitudes'}), 403

        # Validaciones de perfil
        campos_perfil = ['nombre', 'telefono', 'dni']
        for campo in campos_perfil:
            if not data.get(campo):
                return jsonify({'msg': f'Campo de perfil "{campo}" es requerido'}), 400

        if len(str(data['dni'])) > 8:
            return jsonify({'msg': 'El DNI no puede tener más de 8 caracteres'}), 400
        if len(data['nombre']) > 20:
            return jsonify({'msg': 'El nombre no puede tener más de 20 caracteres'}), 400
        if len(data['telefono']) > 20:
            return jsonify({'msg': 'El teléfono no puede tener más de 20 caracteres'}), 400

        # Verificar artesano existente por DNI
        if Artesano.query.filter_by(dni=data['dni']).first():
            return jsonify({'msg': 'El DNI ya está registrado'}), 400

        # Verificar si ya existe un artesano asociado a este usuario
        if Artesano.query.filter_by(usuario_id=current_user['id']).first():
            return jsonify({'msg': 'Ya existe un perfil de artesano asociado a este usuario'}), 400

        # Validaciones de solicitud
        campos_solicitud = ['descripcion', 'dimensiones_ancho', 'dimensiones_largo', 'rubro_id', 'terminos_aceptados']
        for campo in campos_solicitud:
            if data.get(campo) in [None, ""]:
                return jsonify({'msg': f'Campo de solicitud "{campo}" es requerido'}), 400

        if not data['terminos_aceptados']:
            return jsonify({'msg': 'Debe aceptar los términos y condiciones'}), 400

        try:
            ancho = float(str(data['dimensiones_ancho']).replace(',', '.'))
            largo = float(str(data['dimensiones_largo']).replace(',', '.'))
        except ValueError:
            return jsonify({'msg': 'Las dimensiones deben ser valores numéricos válidos'}), 400

        # Crear artesano
        artesano = Artesano(
            usuario_id=current_user['id'],
            nombre=data['nombre'],
            telefono=data['telefono'],
            dni=data['dni']
        )
        db.session.add(artesano)
        db.session.flush()

        # Verificar rubro
        rubro = Rubro.query.get(data['rubro_id'])
        if not rubro:
            db.session.rollback()
            return jsonify({'msg': 'Rubro no válido'}), 400

        # Calcular parcelas y costo
        parcelas_necesarias = max(1, round((ancho / 3.0) * (largo / 3.0)))
        costo_total = parcelas_necesarias * float(rubro.precio_parcela)

        # Estado inicial pendiente
        estado_pendiente = EstadoSolicitud.query.filter_by(nombre='Pendiente').first()
        if not estado_pendiente:
            db.session.rollback()
            return jsonify({'msg': 'El estado "Pendiente" no está configurado en la base de datos'}), 500

        # Crear solicitud
        nueva_solicitud = Solicitud(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_pendiente.estado_solicitud_id,
            descripcion=data['descripcion'],
            dimensiones_ancho=ancho,
            dimensiones_largo=largo,
            rubro_id=data['rubro_id'],
            parcelas_necesarias=parcelas_necesarias,
            costo_total=costo_total,
            terminos_aceptados=True,
            fecha_solicitud=datetime.utcnow()
        )
        db.session.add(nueva_solicitud)
        db.session.flush()

        # Validar fotos (máximo 5)
        fotos_urls = data.get('fotos', [])
        if len(fotos_urls) > 5:
            db.session.rollback()
            return jsonify({'msg': 'No se pueden subir más de 5 fotos por solicitud'}), 400

        fotos_creadas = []
        for url_foto in fotos_urls:
            if not isinstance(url_foto, str):
                continue
            if len(url_foto) > 5000000:
                print("DEBUG - Imagen ignorada por tamaño >5MB")
                continue
            nueva_foto = SolicitudFoto(
                solicitud_id=nueva_solicitud.solicitud_id,
                url_foto=url_foto
            )
            db.session.add(nueva_foto)
            fotos_creadas.append(nueva_foto)

        db.session.commit()

        # Mensaje informativo
        mensaje_notificacion = ""
        if parcelas_necesarias > 1:
            mensaje_notificacion = f"Su puesto requiere {parcelas_necesarias} parcelas. Costo total: ${costo_total:.2f}"

        # Respuesta final al front
        return jsonify({
            'msg': 'Solicitud creada exitosamente',
            'perfil_artesano': getattr(artesano, "to_dict", lambda: {} )(),
            'solicitud': getattr(nueva_solicitud, "to_dict", lambda: {} )(),
            'fotos': [getattr(f, "to_dict", lambda: {} )() for f in fotos_creadas],
            'notificacion': mensaje_notificacion
        }), 201

    except Exception as e:
        db.session.rollback()
        print("ERROR EN crear_solicitud():", str(e))
        print(format_exc())
        return jsonify({'msg': 'Error interno al crear solicitud', 'error': str(e)}), 500





# Obtener la SOLICITUD del artesano 
@solicitud_bp.route('', methods=['GET'])
@jwt_required()
def obtener_solicitud_artesano():
    current_user = get_jwt_identity()
    
    artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
    if not artesano:
        return jsonify({'msg': 'Perfil no encontrado'}), 404
    
    # Obtener la solicitud del artesano
    solicitud = Solicitud.query.filter_by(artesano_id=artesano.artesano_id).first()
    
    if not solicitud:
        return jsonify({
            'perfil_artesano': {
                'nombre': artesano.nombre,
                'telefono': artesano.telefono,
                'dni': artesano.dni
            },
            'solicitud': None,
            'msg': 'No tiene solicitudes activas'
        }), 200
    
    # Obtener las fotos de esta solicitud
    fotos = SolicitudFoto.query.filter_by(solicitud_id=solicitud.solicitud_id).all()
    
    # Crear el objeto de solicitud con fotos incluidas
    solicitud_data = solicitud.to_dict()
    solicitud_data['fotos'] = [foto.to_dict() for foto in fotos]
    
    return jsonify({
        'perfil_artesano': {
            'nombre': artesano.nombre,
            'telefono': artesano.telefono,
            'dni': artesano.dni
        },
        'solicitud': solicitud_data  
    }), 200

"""
@solicitud_bp.route('/<int:solicitud_id>/cancelar', methods=['POST'])
@jwt_required()
def cancelar_solicitud(solicitud_id):
    try:
        current_user = get_jwt_identity()
        
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
        
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        # Verificar que esté en estado aprobado o pendiente (RF6)
        estado_actual = EstadoSolicitud.query.get(solicitud.estado_solicitud_id)
        if estado_actual.nombre not in ['Aprobada', 'Pendiente']:
            return jsonify({'msg': 'No se puede cancelar la solicitud en su estado actual'}), 400
        
        estado_cancelada = EstadoSolicitud.query.filter_by(nombre='Cancelada').first()
        solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
        
        db.session.commit()
        
        return jsonify({'msg': 'Solicitud cancelada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al cancelar solicitud', 'error': str(e)}), 500
    
"""

@solicitud_bp.route('/<int:solicitud_id>/fotos', methods=['POST'])
@jwt_required()
def agregar_foto_solicitud(solicitud_id):
    """Agregar una foto a una solicitud existente"""
    try:
        current_user = get_jwt_identity()
        
        # Verificar que la solicitud pertenezca al artesano
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        data = request.get_json()
        if not data.get('url_foto'):
            return jsonify({'msg': 'URL de foto es requerida'}), 400
        
        nueva_foto = SolicitudFoto(
            solicitud_id=solicitud_id,
            url_foto=data['url_foto']
        )
        
        db.session.add(nueva_foto)
        db.session.commit()
        
        return jsonify({
            'msg': 'Foto agregada exitosamente',
            'foto': nueva_foto.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al agregar foto', 'error': str(e)}), 500


@solicitud_bp.route('/<int:solicitud_id>/fotos', methods=['GET'])
@jwt_required()
def obtener_fotos_solicitud(solicitud_id):
    """Obtener todas las fotos de una solicitud"""
    try:
        current_user = get_jwt_identity()
        
        # Verificar que la solicitud pertenezca al artesano
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        fotos = SolicitudFoto.query.filter_by(solicitud_id=solicitud_id).all()
        
        return jsonify({
            'fotos': [foto.to_dict() for foto in fotos]
        }), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener fotos', 'error': str(e)}), 500
    

@solicitud_bp.route('/fotos/<int:foto_id>', methods=['DELETE'])
@jwt_required()
def eliminar_foto_solicitud(foto_id):
    """Eliminar una foto de una solicitud"""
    try:
        current_user = get_jwt_identity()
        
        # Buscar la foto y verificar permisos
        foto = SolicitudFoto.query.get(foto_id)
        if not foto:
            return jsonify({'msg': 'Foto no encontrada'}), 404
            
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        # Verificar que la solicitud de la foto pertenezca al artesano
        solicitud = Solicitud.query.filter_by(
            solicitud_id=foto.solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'No tiene permisos para eliminar esta foto'}), 403
        
        db.session.delete(foto)
        db.session.commit()
        
        return jsonify({'msg': 'Foto eliminada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al eliminar foto', 'error': str(e)}), 500