from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.solicitud import Solicitud
from models.artesano import Artesano
from models.rubro import Rubro
from models.estado_solicitud import EstadoSolicitud
from models.solicitud_foto import SolicitudFoto 
from models.notificacion import Notificacion
from models.usuario import Usuario
from datetime import datetime
import re
import base64

solicitud_bp = Blueprint('solicitud_bp', __name__, url_prefix='/solicitudes')

def validar_extension(extension):
    extensiones_permitidas = ['jpg', 'jpeg', 'png']  
    return extension.lower() in extensiones_permitidas

def validar_base64(base64_string):
    try:
        if len(base64_string) % 4 == 0 and re.match('^[A-Za-z0-9+/]*={0,2}$', base64_string):
            base64.b64decode(base64_string)
            return True
        return False
    except Exception:
        return False

def get_usuario_actual():
    """Obtiene el usuario actual desde el token JWT"""
    user_identity = get_jwt_identity()  # "user_123"
    usuario_id = int(user_identity.split('_')[1])
    return Usuario.query.get(usuario_id)

@solicitud_bp.route('', methods=['POST'])
@jwt_required()
def crear_solicitud():
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        # Cambiar de request.get_json() a request.form para FormData
        data = request.form
        fotos_files = request.files.getlist('fotos')  # Obtener archivos

        print("DEBUG - Usuario autenticado:", usuario.usuario_id)
        print("DEBUG - Datos recibidos:", dict(data))
        print("DEBUG - Archivos recibidos:", len(fotos_files))

        if usuario.rol_id != 1:
            return jsonify({'msg': 'Solo artesanos pueden crear solicitudes'}), 403

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

        if Artesano.query.filter_by(dni=data['dni']).first():
            return jsonify({'msg': 'El DNI ya está registrado'}), 400

        if Artesano.query.filter_by(usuario_id=usuario.usuario_id).first():
            return jsonify({'msg': 'Ya existe un perfil de artesano asociado a este usuario'}), 400

        campos_solicitud = ['descripcion', 'dimensiones_ancho', 'dimensiones_largo', 'rubro_id']
        for campo in campos_solicitud:
            if not data.get(campo):
                return jsonify({'msg': f'Campo de solicitud "{campo}" es requerido'}), 400

        terminos_aceptados = data.get('terminos_aceptados')
        if not terminos_aceptados or terminos_aceptados.lower() != 'true':
            return jsonify({'msg': 'Debe aceptar los términos y condiciones'}), 400

        try:
            ancho = float(str(data['dimensiones_ancho']).replace(',', '.'))
            largo = float(str(data['dimensiones_largo']).replace(',', '.'))
        except ValueError:
            return jsonify({'msg': 'Las dimensiones deben ser valores numéricos válidos'}), 400

        # Crear artesano
        artesano = Artesano(
            usuario_id=usuario.usuario_id,
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
        parcelas_largo = int(largo / 3)
        if largo % 3 != 0:
            parcelas_largo += 1

        parcelas_ancho = int(ancho / 3)
        if ancho % 3 != 0:
            parcelas_ancho += 1

        parcelas_necesarias = parcelas_largo * parcelas_ancho
        costo_total = parcelas_necesarias * float(rubro.precio_parcela)

        # Estado inicial pendiente
        estado_pendiente = EstadoSolicitud.query.filter_by(nombre='Pendiente').first()
        if not estado_pendiente:
            db.session.rollback()
            return jsonify({'msg': 'Estado "Pendiente" no configurado'}), 500

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

        # Validar cantidad de fotos (máximo 5)
        if len(fotos_files) > 5:
            db.session.rollback()
            return jsonify({'msg': 'No se pueden subir más de 5 fotos por solicitud'}), 400

        fotos_creadas = []
        for foto_file in fotos_files:
            if not foto_file or foto_file.filename == '':
                continue

            # Obtener extensión del archivo
            extension = foto_file.filename.split('.')[-1].lower()
            if extension == 'jpeg':
                extension = 'jpg'

            # Validar extensión
            if not validar_extension(extension):
                return jsonify({'msg': f'Extensión {extension} no permitida. Solo se aceptan JPG y PNG.'}), 400

            # Leer archivo y convertir a base64
            try:
                file_data = foto_file.read()
                base64_puro = base64.b64encode(file_data).decode('utf-8')
                
                # Validar base64
                if not validar_base64(base64_puro):
                    continue

                # Crear registro de foto
                nueva_foto = SolicitudFoto(
                    solicitud_id=nueva_solicitud.solicitud_id,
                    base64=base64_puro,
                    extension=extension.lower()
                )
                db.session.add(nueva_foto)
                fotos_creadas.append(nueva_foto)
                
            except Exception as file_error:
                print(f"Error procesando archivo {foto_file.filename}: {file_error}")
                continue

        db.session.commit()

        mensaje_notificacion = ""
        if parcelas_necesarias > 1:
            mensaje_notificacion = f"Su puesto requiere {parcelas_necesarias} parcelas. Costo total: ${costo_total:.2f}"

        # Convertir fotos para respuesta (con image_url)
        fotos_respuesta = []
        for foto in fotos_creadas:
            foto_data = foto.to_dict()
            foto_data['image_url'] = foto.get_image_url()
            fotos_respuesta.append(foto_data)

        return jsonify({
            'msg': 'Solicitud creada exitosamente',
            'perfil_artesano': artesano.to_dict(),
            'solicitud': nueva_solicitud.to_dict(),
            'fotos': fotos_respuesta,
            'notificacion': mensaje_notificacion
        }), 201

    except Exception as e:
        db.session.rollback()
        print("ERROR EN crear_solicitud():", str(e))
        return jsonify({'msg': 'Error interno al crear solicitud', 'error': str(e)}), 500

@solicitud_bp.route('', methods=['GET'])
@jwt_required()
def obtener_solicitud_artesano():
    usuario = get_usuario_actual()
    if not usuario:
        return jsonify({'msg': 'Usuario no encontrado'}), 404
    
    artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
    if not artesano:
        return jsonify({'msg': 'Perfil no encontrado'}), 404
    
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
    
    # Convertir solicitud a dict y reemplazar fotos con Data URLs
    solicitud_data = solicitud.to_dict()
    solicitud_data['fotos'] = [
        {
            'foto_id': foto.foto_id,
            'solicitud_id': foto.solicitud_id,
            'image_url': foto.get_image_url(),  # Data URL completo para frontend
            'extension': foto.extension,
            'fecha_creacion': foto.fecha_creacion.isoformat() if foto.fecha_creacion else None
        }
        for foto in solicitud.fotos_rel
    ]
    
    return jsonify({
        'perfil_artesano': {
            'nombre': artesano.nombre,
            'telefono': artesano.telefono,
            'dni': artesano.dni
        },
        'solicitud': solicitud_data
    }), 200

@solicitud_bp.route('/<int:solicitud_id>/cancelar', methods=['PUT'])
@jwt_required()
def cancelar_solicitud_artesano(solicitud_id):
    """
    Cancelar una solicitud (puede ser cancelada en cualquier estado)
    """
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404
        
        # Obtener la solicitud
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id,
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        
        # Verificar que el estado "Cancelada" existe
        estado_cancelada = EstadoSolicitud.query.filter_by(nombre='Cancelada').first()
        
        if not estado_cancelada:
            return jsonify({'error': 'Estado "Cancelada" no configurado en el sistema'}), 500
        
        # Obtener el estado actual para el mensaje
        estado_actual = EstadoSolicitud.query.get(solicitud.estado_solicitud_id)
        
        # Si ya está cancelada, no hacer nada
        if solicitud.estado_solicitud_id == estado_cancelada.estado_solicitud_id:
            return jsonify({
                'message': 'La solicitud ya se encuentra cancelada',
                'solicitud': solicitud.to_dict()
            }), 200
        
        # Cambiar estado a cancelada
        solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
        solicitud.fecha_gestion = datetime.utcnow()
        
        db.session.commit()
        
        # Crear notificación de cancelación
        notificacion = Notificacion(
            artesano_id=artesano.artesano_id,
            mensaje=f'Tu solicitud #{solicitud_id} ha sido cancelada exitosamente. Estado anterior: {estado_actual.nombre}',
            estado_notificacion_id=1,  # Asumiendo que 1 es "Enviado"
            leido=False
        )
        db.session.add(notificacion)
        db.session.commit()
        
        return jsonify({
            'message': 'Solicitud cancelada exitosamente',
            'solicitud': solicitud.to_dict(),
            'estado_anterior': estado_actual.nombre
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@solicitud_bp.route('/<int:solicitud_id>/fotos', methods=['POST'])
@jwt_required()
def agregar_fotos_solicitud(solicitud_id):
    """Agregar MÚLTIPLES fotos (1-5) a una solicitud existente desde FormData"""
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        # Cambiar a FormData
        fotos_files = request.files.getlist('fotos')
        
        if not fotos_files or len(fotos_files) == 0:
            return jsonify({'msg': 'Se requiere al menos una foto'}), 400
        
        if len(fotos_files) > 5:
            return jsonify({'msg': 'Máximo 5 fotos por solicitud'}), 400

        fotos_existentes = SolicitudFoto.query.filter_by(solicitud_id=solicitud_id).count()
        if fotos_existentes + len(fotos_files) > 5:
            return jsonify({
                'msg': f'Límite excedido. Tienes {fotos_existentes} fotos, no puedes agregar {len(fotos_files)} más.'
            }), 400

        fotos_creadas = []
        for foto_file in fotos_files:
            if not foto_file or foto_file.filename == '':
                continue

            # Obtener extensión del archivo
            extension = foto_file.filename.split('.')[-1].lower()
            if extension == 'jpeg':
                extension = 'jpg'

            # Validar extensión
            if not validar_extension(extension):
                return jsonify({'msg': f'Extensión {extension} no permitida. Solo se aceptan JPG y PNG.'}), 400

            # Leer archivo y convertir a base64
            try:
                file_data = foto_file.read()
                base64_puro = base64.b64encode(file_data).decode('utf-8')
                
                if not validar_base64(base64_puro):
                    continue

                nueva_foto = SolicitudFoto(
                    solicitud_id=solicitud_id,
                    base64=base64_puro,
                    extension=extension
                )
                db.session.add(nueva_foto)
                fotos_creadas.append(nueva_foto)
                
            except Exception as file_error:
                print(f"Error procesando archivo {foto_file.filename}: {file_error}")
                continue

        db.session.commit()
        
        # Convertir fotos para respuesta (con image_url)
        fotos_respuesta = []
        for foto in fotos_creadas:
            foto_data = foto.to_dict()
            foto_data['image_url'] = foto.get_image_url()
            fotos_respuesta.append(foto_data)
        
        return jsonify({
            'msg': f'{len(fotos_creadas)} fotos agregadas exitosamente',
            'fotos_agregadas': fotos_respuesta,
            'total_fotos': fotos_existentes + len(fotos_creadas)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al agregar fotos', 'error': str(e)}), 500

@solicitud_bp.route('/fotos/<int:foto_id>', methods=['DELETE'])
@jwt_required()
def eliminar_foto_solicitud(foto_id):
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        foto = SolicitudFoto.query.get(foto_id)
        if not foto:
            return jsonify({'msg': 'Foto no encontrada'}), 404
            
        artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
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

@solicitud_bp.route('/fotos/<int:foto_id>/completa', methods=['GET'])
@jwt_required()
def obtener_foto_completa(foto_id):
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        foto = SolicitudFoto.query.get(foto_id)
        if not foto:
            return jsonify({'msg': 'Foto no encontrada'}), 404
            
        artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=foto.solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'No tiene permisos para ver esta foto'}), 403
        
        foto_data = {
            'foto_id': foto.foto_id,
            'solicitud_id': foto.solicitud_id,
            'image_url': foto.get_image_url(),
            'extension': foto.extension,
            'fecha_creacion': foto.fecha_creacion.isoformat() if foto.fecha_creacion else None
        }
        
        return jsonify({'foto': foto_data}), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener foto', 'error': str(e)}), 500

@solicitud_bp.route('/<int:solicitud_id>/fotos-completas', methods=['GET'])
@jwt_required()
def obtener_fotos_completas_solicitud(solicitud_id):
    try:
        usuario = get_usuario_actual()
        if not usuario:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        artesano = Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        fotos = SolicitudFoto.query.filter_by(solicitud_id=solicitud_id).all()
        
        fotos_completas = []
        for foto in fotos:
            fotos_completas.append({
                'foto_id': foto.foto_id,
                'solicitud_id': foto.solicitud_id,
                'image_url': foto.get_image_url(),
                'extension': foto.extension,
                'fecha_creacion': foto.fecha_creacion.isoformat() if foto.fecha_creacion else None
            })
        
        return jsonify({
            'fotos': fotos_completas
        }), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener fotos', 'error': str(e)}), 500