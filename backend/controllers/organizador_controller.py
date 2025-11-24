from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Usuario, Mapa, Parcela, Solicitud, SolicitudParcela, EstadoSolicitud

organizador_bp = Blueprint('organizador_bp', __name__)

@organizador_bp.route('/mapa/configurar', methods=['POST'])
@jwt_required()
def configurar_mapa_organizador():
    try:
        user_identity = get_jwt_identity()
        usuario_id = int(user_identity.split('_')[1]) if isinstance(user_identity, str) else int(user_identity)
        usuario = Usuario.query.get(usuario_id)

        if not usuario or usuario.rol_id != 3:
            return jsonify({'error': 'Acceso denegado. Requiere rol Organizador (3).'}), 403

        data = request.get_json()
        nuevas_filas = data.get("filas")
        nuevas_columnas = data.get("columnas")

        if nuevas_filas is None or nuevas_columnas is None:
            return jsonify({'error': 'Debe enviar "filas" y "columnas".'}), 400

        try:
            nuevas_filas = int(nuevas_filas)
            nuevas_columnas = int(nuevas_columnas)
        except:
            return jsonify({'error': 'Las filas y columnas deben ser números enteros.'}), 400

        if not (1 <= nuevas_filas <= 100):
            return jsonify({'error': 'El valor de "filas" debe estar entre 1 y 100.'}), 422

        if not (1 <= nuevas_columnas <= 100):
            return jsonify({'error': 'El valor de "columnas" debe estar entre 1 y 100.'}), 422

        mapa = Mapa.query.first()

        if not mapa:
            mapa = Mapa(
                cant_total_filas=nuevas_filas,
                cant_total_columnas=nuevas_columnas
            )
            db.session.add(mapa)
            db.session.commit()

            for f in range(1, nuevas_filas + 1):
                for c in range(1, nuevas_columnas + 1):
                    db.session.add(Parcela(
                        fila=f,
                        columna=c,
                        habilitada=True,
                        mapa_id=mapa.mapa_id,
                        rubro_id=None,
                        tipo_parcela_id=None
                    ))
            db.session.commit()

            return jsonify({'message': 'Mapa configurado correctamente.'}), 201

        filas_actuales = mapa.cant_total_filas
        columnas_actuales = mapa.cant_total_columnas

       
        parcelas_sobrantes = Parcela.query.filter(
            (Parcela.fila > nuevas_filas) |
            (Parcela.columna > nuevas_columnas)
        ).all()

        ocupadas = []
        for p in parcelas_sobrantes:
            solicitud_ocupada = db.session.query(SolicitudParcela).join(
                Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
            ).join(
                EstadoSolicitud, Solicitud.estado_solicitud_id == EstadoSolicitud.estado_solicitud_id
            ).filter(
                SolicitudParcela.parcela_id == p.parcela_id,
                EstadoSolicitud.nombre == 'Aprobada'
            ).first()

            if solicitud_ocupada:
                ocupadas.append({
                    'parcela_id': p.parcela_id,
                    'fila': p.fila,
                    'columna': p.columna
                })

        if ocupadas:
            return jsonify({
                'error': 'No se puede reducir el mapa: hay parcelas ocupadas.',
                'parcelas_ocupadas': ocupadas
            }), 400

        for p in parcelas_sobrantes:
            db.session.delete(p)

        for f in range(1, nuevas_filas + 1):
            for c in range(1, nuevas_columnas + 1):
                existente = Parcela.query.filter_by(
                    fila=f, columna=c, mapa_id=mapa.mapa_id
                ).first()

                if not existente:
                    db.session.add(Parcela(
                        fila=f,
                        columna=c,
                        habilitada=True,
                        mapa_id=mapa.mapa_id,
                        rubro_id=None,
                        tipo_parcela_id=None
                    ))

        mapa.cant_total_filas = nuevas_filas
        mapa.cant_total_columnas = nuevas_columnas
        db.session.commit()

        return jsonify({'message': 'Mapa actualizado correctamente.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
