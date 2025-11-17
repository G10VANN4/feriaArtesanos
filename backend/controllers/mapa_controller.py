from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.parcela import Parcela
from models.mapa import Mapa
from models.artesano import Artesano
from models.usuario import Usuario
from models.solicitud import Solicitud
from models.estado_solicitud import EstadoSolicitud
from models.rubro import Rubro
from models.solicitud_parcela import SolicitudParcela
from models.color import Color

parcela_bp = Blueprint('parcela', __name__, url_prefix='/api/v1')

def get_usuario_actual():
    """Obtiene el usuario actual desde el token JWT"""
    user_identity = get_jwt_identity()
    usuario_id = int(user_identity.split('_')[1])
    return Usuario.query.get(usuario_id)

def get_artesano_from_user():
    """Obtiene el artesano asociado al usuario autenticado"""
    usuario = get_usuario_actual()
    if not usuario:
        return None
    return Artesano.query.filter_by(usuario_id=usuario.usuario_id).first()


@parcela_bp.route('/mapa/parcelas', methods=['GET'])
@jwt_required()
def obtener_parcelas_mapa():
    try:
        user_identity = get_jwt_identity()

        # Extraer ID del usuario
        if isinstance(user_identity, str) and user_identity.startswith('user_'):
            usuario_id = int(user_identity.split('_')[1])
        else:
            usuario_id = int(user_identity)

        mapa = Mapa.query.first()
        if not mapa:
            return jsonify({'error': 'No se ha configurado el mapa'}), 404

        parcelas = Parcela.query.filter_by(mapa_id=mapa.mapa_id).all()

        parcelas_data = []
        for parcela in parcelas:
            parcela_data = {
                'parcela_id': parcela.parcela_id,
                'fila': parcela.fila,
                'columna': parcela.columna,
                'habilitada': parcela.habilitada,
                'rubro_id': parcela.rubro_id
            }

            # Info del rubro
            rubro = Rubro.query.get(parcela.rubro_id)
            if rubro:
                color = Color.query.get(rubro.color_id)
                parcela_data['rubro_info'] = {
                    'tipo': rubro.tipo,
                    'color': color.codigo_hex if color else '#CCCCCC'
                }

            # Verificar si está ocupada
            solicitud_ocupada = db.session.query(SolicitudParcela).join(
                Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
            ).join(
                EstadoSolicitud, Solicitud.estado_solicitud_id == EstadoSolicitud.estado_solicitud_id
            ).filter(
                SolicitudParcela.parcela_id == parcela.parcela_id,
                EstadoSolicitud.nombre == 'Aprobada'
            ).first()

            parcela_data['ocupada'] = solicitud_ocupada is not None
            parcelas_data.append(parcela_data)

        return jsonify({
            'parcelas': parcelas_data,
            'mapa': {
                'mapa_id': mapa.mapa_id,
                'cant_total_filas': mapa.cant_total_filas,
                'cant_total_columnas': mapa.cant_total_columnas
            },
            'total': len(parcelas_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parcela_bp.route('/parcelas/<int:parcela_id>/seleccionar', methods=['POST'])
@jwt_required()
def seleccionar_parcela(parcela_id):
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404

        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        solicitud_aprobada = Solicitud.query.filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()

        if not solicitud_aprobada:
            return jsonify({
                'error': 'No tienes una solicitud APROBADA.'
            }), 400

        parcela = Parcela.query.get(parcela_id)
        if not parcela:
            return jsonify({'error': 'Parcela no encontrada'}), 404

        if not parcela.habilitada:
            return jsonify({'error': 'Esta parcela no está habilitada'}), 400

        # Verificar ocupada
        ocupada = db.session.query(SolicitudParcela).join(
            Solicitud
        ).filter(
            SolicitudParcela.parcela_id == parcela_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()

        if ocupada:
            return jsonify({'error': 'Esta parcela ya está ocupada'}), 400

        # Verificar rubro
        if parcela.rubro_id != solicitud_aprobada.rubro_id:
            return jsonify({'error': 'Rubro incompatible con tu solicitud'}), 400

        # Verificar si ya tiene parcela
        ya_tiene = db.session.query(SolicitudParcela).join(
            Solicitud
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()

        if ya_tiene:
            return jsonify({'error': 'Ya tienes una parcela asignada'}), 400

        # Crear asignación
        nueva = SolicitudParcela(
            solicitud_id=solicitud_aprobada.solicitud_id,
            parcela_id=parcela_id
        )

        db.session.add(nueva)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '¡Parcela seleccionada exitosamente!',
            'solicitud_parcela_id': nueva.solicitud_parcela_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@parcela_bp.route('/artesano/mi-parcela', methods=['GET'])
@jwt_required()
def obtener_mi_parcela():
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404

        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()

        solicitud_parcela = SolicitudParcela.query.join(
            Solicitud
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()

        if not solicitud_parcela:
            return jsonify({'message': 'No tienes parcela asignada'}), 404

        parcela = solicitud_parcela.parcela_rel

        data = parcela.to_dict()

        if parcela.rubro_rel:
            data['rubro_info'] = {
                'tipo': parcela.rubro_rel.tipo,
                'color': parcela.rubro_rel.color_rel.codigo_hex if parcela.rubro_rel.color_rel else '#CCCCCC'
            }

        data['artesano_info'] = {
            'nombre': artesano.nombre,
            'artesano_id': artesano.artesano_id
        }

        return jsonify({
            'parcela': data,
            'solicitud_parcela_id': solicitud_parcela.solicitud_parcela_id
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@parcela_bp.route('/artesano/mi-parcela/liberar', methods=['DELETE'])
@jwt_required()
def liberar_parcela():
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404

        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()

        solicitud_parcela = SolicitudParcela.query.join(
            Solicitud
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()

        if not solicitud_parcela:
            return jsonify({'error': 'No tienes parcela asignada'}), 404

        db.session.delete(solicitud_parcela)
        db.session.commit()

        return jsonify({'message': 'Parcela liberada exitosamente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@parcela_bp.route('/admin/parcelas/<int:parcela_id>/rubro', methods=['PUT'])
@jwt_required()
def asignar_rubro(parcela_id):
    """
    Cambiar el rubro de una parcela (ADMIN)
    """
    try:
        data = request.json
        rubro_id = data.get('rubro_id')

        if not rubro_id:
            return jsonify({'error': 'Se requiere rubro_id'}), 400

        parcela = Parcela.query.get(parcela_id)
        if not parcela:
            return jsonify({'error': 'Parcela no encontrada'}), 404

        rubro = Rubro.query.get(rubro_id)
        if not rubro:
            return jsonify({'error': 'Rubro no encontrado'}), 404

        parcela.rubro_id = rubro_id
        db.session.commit()

        return jsonify({
            'message': 'Rubro asignado correctamente',
            'parcela_id': parcela.parcela_id,
            'nuevo_rubro': rubro.tipo
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@parcela_bp.route('/admin/rubros/<int:rubro_id>/color', methods=['PUT'])
@jwt_required()
def asignar_color_rubro(rubro_id):
    """
    Cambiar el color HEX de un rubro (ADMIN)
    """
    try:
        color_hex = request.json.get('color')
        if not color_hex:
            return jsonify({"error": "Se requiere color en formato HEX"}), 400

        rubro = Rubro.query.get(rubro_id)
        if not rubro:
            return jsonify({"error": "Rubro no encontrado"}), 404

        color = Color.query.filter_by(codigo_hex=color_hex).first()
        if not color:
            return jsonify({"error": "El color no existe en tabla Color"}), 404

        rubro.color_id = color.color_id
        db.session.commit()

        return jsonify({
            "message": "Color asignado correctamente al rubro",
            "rubro_id": rubro_id,
            "color": color_hex
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@parcela_bp.route('/rubros', methods=['GET'])
@jwt_required()
def obtener_rubros():
    """
    Obtener todos los rubros disponibles con sus colores
    """
    try:
        print("🔍 Intentando obtener rubros...")
        
        # Obtener solo rubros activos
        rubros = Rubro.query.filter_by(es_activo=True).all()
        print(f"Se encontraron {len(rubros)} rubros activos")
        
        rubros_data = []
        for rubro in rubros:
            print(f"📋 Procesando rubro: {rubro.tipo}")
            
            # Construir datos del rubro
            rubro_data = {
                'rubro_id': rubro.rubro_id,
                'tipo': rubro.tipo,
                'precio_parcela': float(rubro.precio_parcela),
                'color_id': rubro.color_id,
                'es_activo': rubro.es_activo
            }
            
            # Incluir información del color relacionado
            if hasattr(rubro, 'color_rel') and rubro.color_rel:
                rubro_data['color_rel'] = {
                    'color_id': rubro.color_rel.color_id,
                    'codigo_hex': rubro.color_rel.codigo_hex,
                    'nombre': rubro.color_rel.nombre
                }
                print(f"Color encontrado: {rubro.color_rel.codigo_hex}")
            else:
                print("No se pudo acceder al color_rel, usando color por defecto")
                # Color por defecto si no hay relación
                rubro_data['color_rel'] = {
                    'color_id': rubro.color_id,
                    'codigo_hex': '#CCCCCC',
                    'nombre': 'Color por defecto'
                }
            
            rubros_data.append(rubro_data)
        
        print(f"Enviando {len(rubros_data)} rubros al frontend")
        return jsonify(rubros_data), 200

    except Exception as e:
        print(f"Error en obtener_rubros: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error al cargar rubros: {str(e)}'}), 500