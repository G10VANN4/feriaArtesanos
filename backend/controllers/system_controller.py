# controllers/system_controller.py - ACTUALIZADO
from flask import Blueprint, jsonify
from werkzeug.security import generate_password_hash
from models.base import db
from models.administrador import Administrador
from models.artesano import Artesano
from models.color import Color
from models.mapa import Mapa
from models.estado_notificacion import EstadoNotificacion
from models.estado_pago import EstadoPago
from models.estado_solicitud import EstadoSolicitud
from models.estado_usuario import EstadoUsuario
from models.Tipo_parcela import Tipo_parcela
from models.historial_participacion import HistorialParticipacion
from models.limite_rubro import LimiteRubro
from models.notificacion import Notificacion
from models.organizador import Organizador
from models.pago import Pago
from models.parcela import Parcela
from models.rol import Rol
from models.rubro import Rubro
from models.solicitud import Solicitud
from models.solicitud_foto import SolicitudFoto
from models.solicitud_parcela import SolicitudParcela
from models.usuario import Usuario

# Crear blueprint directamente en el controller
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
        }), 200
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

        # PRIMERO insertar datos básicos
        
        # 1. Roles 
        if Rol.query.count() == 0:
            roles = [Rol(tipo=t, es_activo=True) for t in ['Artesano', 'Administrador', 'Organizador']]
            db.session.add_all(roles)
            db.session.flush()
            print("✅ Roles insertados")
            datos_insertados = True

        # 2. Estados de usuario 
        if EstadoUsuario.query.count() == 0:
            estados = [EstadoUsuario(tipo=t, es_activo=True) for t in ['Activo', 'Inactivo']]
            db.session.add_all(estados)
            db.session.flush()
            print("✅ Estados de usuario insertados")
            datos_insertados = True

        # 3. Colores (necesarios para Rubro)
        if Color.query.count() == 0:
            colores = [
                Color(nombre='Naranja Gastronomía', codigo_hex='#FF6B35'),
                Color(nombre='Turquesa Reventa', codigo_hex='#2EC4B6'),
                Color(nombre='Morado Artesanías', codigo_hex='#6A4C93')
            ]
            db.session.add_all(colores)
            db.session.flush()
            print("✅ Colores insertados")
            datos_insertados = True

        # 4. Estados de Solicitud ( para RF5)
        if EstadoSolicitud.query.count() == 0:
            estados_solicitud = [
                EstadoSolicitud(nombre='Pendiente', es_activo=True),
                EstadoSolicitud(nombre='Aprobada', es_activo=True),
                EstadoSolicitud(nombre='Rechazada', es_activo=True),
                EstadoSolicitud(nombre='Cancelada', es_activo=True),
                EstadoSolicitud(nombre='Pendiente por modificación', es_activo=True)
            ]
            db.session.add_all(estados_solicitud)
            db.session.flush()
            print("✅ Estados de solicitud insertados")
            datos_insertados = True

        # 5. Estados de Pago (para RF24)
        if EstadoPago.query.count() == 0:
            estados_pago = [
                EstadoPago(tipo='Pendiente', es_activo=True),
                EstadoPago(tipo='Pagado', es_activo=True),
                EstadoPago(tipo='Rechazado', es_activo=True),
                EstadoPago(tipo='Cancelado', es_activo=True)
            ]
            db.session.add_all(estados_pago)
            db.session.flush()
            print("✅ Estados de pago insertados")
            datos_insertados = True

        # 6. Estados de Notificación
        if EstadoNotificacion.query.count() == 0:
            estados_notificacion = [
                EstadoNotificacion(nombre='Enviada', es_activo=True),
                EstadoNotificacion(nombre='Leída', es_activo=True),
                EstadoNotificacion(nombre='Fallida', es_activo=True)
            ]
            db.session.add_all(estados_notificacion)
            db.session.flush()
            print("✅ Estados de notificación insertados")
            datos_insertados = True

        # 7. insertar Rubros 
        if Rubro.query.count() == 0:
            color_gastronomia = Color.query.filter_by(nombre='Naranja Gastronomía').first()
            color_reventa = Color.query.filter_by(nombre='Turquesa Reventa').first()
            color_artesanias = Color.query.filter_by(nombre='Morado Artesanías').first()
            
            rubros = [
                Rubro(tipo='Gastronomía', precio_parcela=0, color_id=color_gastronomia.color_id),
                Rubro(tipo='Reventa', precio_parcela=0, color_id=color_reventa.color_id),
                Rubro(tipo='Artesanías', precio_parcela=0, color_id=color_artesanias.color_id)
            ]
            db.session.add_all(rubros)
            print("Rubros insertados")
            datos_insertados = True

        # 7.5 CREAR TIPO_PARcELA BÁSICO SI NO EXISTE
        if Tipo_parcela.query.count() == 0:
            tipo_basico = Tipo_parcela(tipo='Básica', es_activo=True)
            db.session.add(tipo_basico)
            db.session.flush()  # Esto es importante para obtener el ID
            print("✅ Tipo de parcela básica creado")
            datos_insertados = True

    


        
        # Obtener IDs necesarios
        estado_activo = EstadoUsuario.query.filter_by(tipo='Activo').first()
        rol_organizador = Rol.query.filter_by(tipo='Organizador').first()

     
       
        # 10. Crear usuario Organizador también
        if Usuario.query.filter_by(email='organizador@feria.com').first() is None:
            org_user = Usuario(
                email='organizador@feria.com',
                estado_id=estado_activo.estado_id,
                rol_id=rol_organizador.rol_id
            )
            org_user.set_password('org123')  # Usar el método del modelo
            
            db.session.add(org_user)
            db.session.flush()
            
            print("✅ Usuario Organizador creado: organizador@feria.com / org123")
            admin_creado = True

        db.session.commit()

        return jsonify({
            'success': True,
            'message': '✅ Base de datos inicializada completamente',
            'datos_insertados': datos_insertados,
            'credenciales_organizador': {
                'email': 'organizador@feria.com',
                'password': 'org123',
                'rol': 'Organizador'
            },
            'estadisticas': {
                'roles': Rol.query.count(),
                'estados_usuario': EstadoUsuario.query.count(),
                'estados_solicitud': EstadoSolicitud.query.count(),
                'estados_pago': EstadoPago.query.count(),
                'estados_notificacion': EstadoNotificacion.query.count(),
                'colores': Color.query.count(),
                'rubros': Rubro.query.count(),
                'usuarios': Usuario.query.count(),
                'administradores': Administrador.query.count()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error en init-db: {str(e)}")
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
        
        # Verificar si existen los usuarios admin
        admin_user = Usuario.query.filter_by(email='admin@feria.com').first()
        org_user = Usuario.query.filter_by(email='organizador@feria.com').first()
        
        return jsonify({
            'success': True,
            'database': 'MySQL',
            'estado': 'Conectado',
            'usuarios_admin': {
                'admin_existe': admin_user is not None,
                'organizador_existe': org_user is not None
            },
            'estadisticas': total_tablas
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500