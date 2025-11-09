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
    """Obtener parcelas para artesano - VERSIÓN SIMPLIFICADA"""
    try:
        print("🎯 INICIANDO obtener_parcelas_mapa")
        
        # Obtener identity DIRECTAMENTE
        user_identity = get_jwt_identity()
        print(f"🎯 User identity: {user_identity}")
        
        # Extraer ID del usuario
        if isinstance(user_identity, str) and user_identity.startswith('user_'):
            usuario_id = int(user_identity.split('_')[1])
        else:
            usuario_id = int(user_identity)
            
        print(f"🎯 Usuario ID: {usuario_id}")
        
        # OBTENER DATOS DEL MAPA
        mapa = Mapa.query.first()
        if not mapa:
            return jsonify({'error': 'No se ha configurado el mapa'}), 404
            
        # Obtener parcelas
        parcelas = Parcela.query.filter_by(mapa_id=mapa.mapa_id).all()
        
        # Procesar parcelas (versión simplificada para artesanos)
        parcelas_data = []
        for parcela in parcelas:
            parcela_data = {
                'parcela_id': parcela.parcela_id,
                'fila': parcela.fila,
                'columna': parcela.columna,
                'habilitada': parcela.habilitada,
                'rubro_id': parcela.rubro_id
            }
            
            # Info básica del rubro
            rubro = Rubro.query.get(parcela.rubro_id)
            if rubro:
                color = Color.query.get(rubro.color_id)
                parcela_data['rubro_info'] = {
                    'tipo': rubro.tipo,
                    'color': color.codigo_hex if color else '#CCCCCC'
                }
            
            # Verificar ocupación básica
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
        import traceback
        print(f"❌ ERROR en obtener_parcelas_mapa: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@parcela_bp.route('/parcelas/<int:parcela_id>/seleccionar', methods=['POST'])
@jwt_required()
def seleccionar_parcela(parcela_id):
    """
    RF: El artesano selecciona su parcela - COMPLETAMENTE CORREGIDO SIN RELACIONES
    """
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404
        
        print(f"Artesano {artesano.artesano_id} ({artesano.nombre}) intentando seleccionar parcela {parcela_id}")
        
        # 1. Verificar si el artesano tiene una solicitud APROBADA
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({'error': 'Estado Aprobada no configurado en el sistema'}), 500
        
        solicitud_aprobada = Solicitud.query.filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud_aprobada:
            return jsonify({
                'error': 'No tienes una solicitud APROBADA. Debes tener una solicitud aprobada para seleccionar parcela.'
            }), 400
        
        print(f"Solicitud aprobada encontrada: {solicitud_aprobada.solicitud_id}, Rubro: {solicitud_aprobada.rubro_id}")
        
        # 2. Verificar si la parcela existe
        parcela = Parcela.query.get(parcela_id)
        if not parcela:
            return jsonify({'error': 'Parcela no encontrada'}), 404
        
        print(f"Parcela encontrada: {parcela.parcela_id}, Rubro: {parcela.rubro_id}, Habilitada: {parcela.habilitada}")
        
        # 3. Verificar si la parcela está habilitada
        if not parcela.habilitada:
            return jsonify({'error': 'Esta parcela no está habilitada para selección'}), 400
        
        # 4. Verificar si la parcela ya está OCUPADA por otro artesano - CONSULTA DIRECTA COMPLETA
        solicitud_parcela_ocupada = db.session.query(SolicitudParcela).join(
            Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
        ).filter(
            SolicitudParcela.parcela_id == parcela_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()
        
        if solicitud_parcela_ocupada:
            # Obtener información del artesano ocupante DIRECTAMENTE
            solicitud_ocupante = Solicitud.query.get(solicitud_parcela_ocupada.solicitud_id)
            if solicitud_ocupante:
                artesano_ocupante = Artesano.query.get(solicitud_ocupante.artesano_id)
                if artesano_ocupante:
                    return jsonify({
                        'error': f'Esta parcela ya está ocupada por {artesano_ocupante.nombre}'
                    }), 400
            return jsonify({
                'error': 'Esta parcela ya está ocupada por otro artesano'
            }), 400
        
        # 5. Verificar que el RUBRO de la parcela coincida con el de la solicitud aprobada
        if parcela.rubro_id != solicitud_aprobada.rubro_id:
            # Obtener rubros por ID directamente
            rubro_parcela = Rubro.query.get(parcela.rubro_id)
            rubro_solicitud = Rubro.query.get(solicitud_aprobada.rubro_id)
            return jsonify({
                'error': f'Rubro incompatible. Tu solicitud es para {rubro_solicitud.tipo if rubro_solicitud else "N/A"} pero esta parcela es para {rubro_parcela.tipo if rubro_parcela else "N/A"}'
            }), 400
        
        # 6. Verificar si el artesano ya tiene otra parcela asignada - CONSULTA DIRECTA COMPLETA
        solicitud_parcela_actual = db.session.query(SolicitudParcela).join(
            Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()
        
        if solicitud_parcela_actual:
            parcela_asignada = Parcela.query.get(solicitud_parcela_actual.parcela_id)
            if parcela_asignada:
                return jsonify({
                    'error': 'Ya tienes una parcela asignada. Solo puedes tener una parcela.',
                    'parcela_actual': {
                        'parcela_id': parcela_asignada.parcela_id,
                        'fila': parcela_asignada.fila,
                        'columna': parcela_asignada.columna
                    }
                }), 400
        
        # 7. CREAR LA ASIGNACIÓN - la parcela queda como PROPIA para este artesano
        nueva_solicitud_parcela = SolicitudParcela(
            solicitud_id=solicitud_aprobada.solicitud_id,
            parcela_id=parcela_id
        )
        
        db.session.add(nueva_solicitud_parcela)
        db.session.commit()
        
        print(f"✅ Parcela {parcela_id} asignada EXITOSAMENTE a artesano {artesano.artesano_id}")
        
        # Preparar respuesta - SIN USAR RELACIONES
        parcela_data = {
            'parcela_id': parcela.parcela_id,
            'fila': parcela.fila,
            'columna': parcela.columna,
            'habilitada': parcela.habilitada,
            'rubro_id': parcela.rubro_id
        }
        
        # Obtener información del rubro DIRECTAMENTE
        rubro = Rubro.query.get(parcela.rubro_id)
        if rubro:
            color = Color.query.get(rubro.color_id)
            parcela_data['rubro_info'] = {
                'tipo': rubro.tipo,
                'color': color.codigo_hex if color else '#CCCCCC'
            }
        
        return jsonify({
            'success': True,
            'message': '¡Parcela seleccionada exitosamente! Ya es tuya.',
            'parcela': parcela_data,
            'solicitud_parcela_id': nueva_solicitud_parcela.solicitud_parcela_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error al seleccionar parcela: {str(e)}")
        return jsonify({'error': f'Error interno: {str(e)}'}), 500

@parcela_bp.route('/artesano/mi-parcela', methods=['GET'])
@jwt_required()
def obtener_mi_parcela():
    """
    Obtener la parcela del artesano autenticado
    """
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404
        
        # Buscar solicitud aprobada con parcela asignada
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({'error': 'Estado Aprobada no configurado'}), 500
        
        solicitud_parcela = SolicitudParcela.query.join(
            Solicitud
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud_parcela:
            return jsonify({'message': 'No tienes parcela asignada'}), 404
        
        parcela = solicitud_parcela.parcela_rel
        parcela_data = parcela.to_dict()
        
        # Agregar información del rubro
        if parcela.rubro_rel:
            parcela_data['rubro_info'] = {
                'tipo': parcela.rubro_rel.tipo,
                'color': parcela.rubro_rel.color_rel.codigo_hex if parcela.rubro_rel.color_rel else '#CCCCCC'
            }
        
        parcela_data['artesano_info'] = {
            'nombre': artesano.nombre,
            'artesano_id': artesano.artesano_id
        }
        
        return jsonify({
            'parcela': parcela_data,
            'solicitud_parcela_id': solicitud_parcela.solicitud_parcela_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@parcela_bp.route('/artesano/mi-parcela/liberar', methods=['DELETE'])
@jwt_required()
def liberar_parcela():
    """
    Liberar la parcela del artesano autenticado
    """
    try:
        artesano = get_artesano_from_user()
        if not artesano:
            return jsonify({'error': 'Artesano no encontrado'}), 404
        
        # Buscar solicitud-parcela activa
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({'error': 'Estado Aprobada no configurado'}), 500
        
        solicitud_parcela = SolicitudParcela.query.join(
            Solicitud
        ).filter(
            Solicitud.artesano_id == artesano.artesano_id,
            Solicitud.estado_solicitud_id == estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud_parcela:
            return jsonify({'error': 'No tienes parcela asignada'}), 404
        
        # Eliminar la relación (liberar la parcela)
        db.session.delete(solicitud_parcela)
        db.session.commit()
        
        return jsonify({
            'message': 'Parcela liberada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500