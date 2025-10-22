# routes/system_routes.py
from flask import Blueprint, jsonify
from models.base import db

# Importar TODAS las clases de modelos
from models.administrador import Administrador
from models.artesano import Artesano
from models.color import Color
from models.configuracion_grid import ConfiguracionGrid
from models.estado_notificacion import EstadoNotificacion
from models.estado_pago import EstadoPago
from models.estado_solicitud import EstadoSolicitud
from models.estado_usuario import EstadoUsuario
from models.grid_cuadrado import GridCuadrado
from models.historial_participacion import HistorialParticipacion
from models.limite_rubro import LimiteRubro
from models.notificacion import Notificacion
from models.organizador import Organizador
from models.pago import Pago
from models.parcela import Parcela
from models.reasignacion_puesto import ReasignacionPuesto
from models.rol import Rol
from models.rubro import Rubro
from models.solicitud import Solicitud
from models.solicitud_foto import SolicitudFoto
from models.solicitud_parcela import SolicitudParcela
from models.usuario import Usuario

system_bp = Blueprint('system_bp', __name__)

@system_bp.route('/')
def home():
    return jsonify({
        'message': '✅ Sistema de Ferias con MySQL',
        'status': 'active',
        'database': 'MySQL',
        'endpoints': {
            'init_db': '/api/init-db',
            'test_connection': '/api/test-connection',
            'status': '/api/status'
        }
    })

@system_bp.route('/api/test-connection')
def test_connection():
    """Probar conexión a MySQL"""
    try:
        db.engine.connect()
        return jsonify({
            'success': True,
            'message': '✅ Conexión a MySQL exitosa',
            'database': 'sistema_ferias'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '❌ Error de conexión. Revisa la configuración.'
        }), 500


@system_bp.route('/api/init-db')
def init_db():
    """Crear todas las tablas y datos iniciales automáticamente"""
    try:
        db.create_all()
        print("✅ Tablas creadas exitosamente en MySQL")
        datos_insertados = False

        # Datos iniciales: roles, estados y rubros base
        if Rol.query.count() == 0:
            roles = [Rol(tipo=t, es_activo=True) for t in ['Artesano', 'Administrador', 'Organizador']]
            db.session.add_all(roles)
            print("✅ Roles insertados")
            datos_insertados = True

        if EstadoUsuario.query.count() == 0:
            estados = [EstadoUsuario(tipo=t, es_activo=True) for t in ['Activo', 'Inactivo']]
            db.session.add_all(estados)
            print("✅ Estados de usuario insertados")
            datos_insertados = True

        if Color.query.count() == 0:
            colores = [
                Color(nombre='Rojo', codigo_hex='#FF0000'),
                Color(nombre='Verde', codigo_hex='#00FF00'),
                Color(nombre='Azul', codigo_hex='#0000FF')
            ]
            db.session.add_all(colores)
            print("✅ Colores insertados")
            datos_insertados = True

        if Rubro.query.count() == 0:
            rubros = [
                Rubro(tipo='Gastronomía', precio_parcela=100000, color_id=1),
                Rubro(tipo='Reventa', precio_parcela=25000, color_id=2),
                Rubro(tipo='Artesanías', precio_parcela=15000, color_id=3)
            ]
            db.session.add_all(rubros)
            print("✅ Rubros insertados")
            datos_insertados = True

        db.session.commit()

        return jsonify({
            'success': True,
            'message': '✅ Base de datos inicializada completamente',
            'datos_insertados': datos_insertados,
            'estadisticas': {
                'roles': Rol.query.count(),
                'estados_usuario': EstadoUsuario.query.count(),
                'colores': Color.query.count(),
                'rubros': Rubro.query.count()
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@system_bp.route('/api/status')
def status():
    """Verificar estado general del sistema y la base"""
    try:
        total_tablas = {
            'roles': Rol.query.count(),
            'usuarios': Usuario.query.count(),
            'artesanos': Artesano.query.count(),
            'organizadores': Organizador.query.count(),
            'administradores': Administrador.query.count(),
            'rubros': Rubro.query.count(),
            'parcelas': Parcela.query.count(),
            'pagos': Pago.query.count(),
            'solicitudes': Solicitud.query.count(),
            'notificaciones': Notificacion.query.count(),
        }
        return jsonify({
            'success': True,
            'database': 'MySQL',
            'estado': 'Conectado',
            'estadisticas': total_tablas
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
