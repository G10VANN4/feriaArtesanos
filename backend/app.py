# app.py - VERSIÓN COMPLETA MYSQL AUTOMÁTICA
import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:lu123@localhost/sistema_ferias'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

from models.base import db
db.init_app(app)

# Importar todos los modelos
from models.rol import Rol
from models.estado_usuario import EstadoUsuario
from models.color import Color
from models.rubro import Rubro
from models.usuario import Usuario
from models.artesano import Artesano

print("🚀 Sistema configurado para MySQL")

@app.route('/')
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

@app.route('/api/test-connection')
def test_connection():
    """Probar conexión a MySQL"""
    try:
        with app.app_context():
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


###inicaliza todas las tablas con datos
@app.route('/api/init-db')
def init_db():
    """Crear todas las tablas y datos iniciales automáticamente"""
    try:
        with app.app_context():
            # 1. Crear todas las tablas
            db.create_all()
            print("✅ Tablas creadas exitosamente en MySQL")
            
            # 2. Verificar e insertar datos iniciales
            datos_insertados = False
            
            # Insertar roles si no existen
            if Rol.query.count() == 0:
                roles = [Rol(tipo=tipo, es_activo=True) for tipo in ['Artesano', 'Administrador', 'Organizador']]
                for rol in roles:
                    db.session.add(rol)
                print("✅ Roles insertados")
                datos_insertados = True
            
            # Insertar estados de usuario si no existen
            if EstadoUsuario.query.count() == 0:
                estados = [EstadoUsuario(tipo=tipo, es_activo=True) for tipo in ['Activo', 'Inactivo']]
                for estado in estados:
                    db.session.add(estado)
                print("✅ Estados de usuario insertados")
                datos_insertados = True
            
            # Insertar colores si no existen
            if Color.query.count() == 0:
                colores = [
                    Color(nombre='Rojo', codigo_hex='#FF0000'),
                    Color(nombre='Verde', codigo_hex='#00FF00'),
                    Color(nombre='Azul', codigo_hex='#0000FF')
                ]
                for color in colores:
                    db.session.add(color)
                print("✅ Colores insertados")
                datos_insertados = True
            
            # Insertar rubros si no existen
            if Rubro.query.count() == 0:
                rubros = [
                    Rubro(tipo='Gastronomía', precio_parcela=100000, color_id=1),
                    Rubro(tipo='Reventa', precio_parcela=25000, color_id=2),
                    Rubro(tipo='Artesanías', precio_parcela=15000, color_id=3)
                ]
                for rubro in rubros:
                    db.session.add(rubro)
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
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/status')
def status():
    """Verificar estado de la base de datos"""
    try:
        with app.app_context():
            return jsonify({
                'success': True,
                'database': 'MySQL',
                'estado': 'Conectado',
                'tablas': {
                    'roles': Rol.query.count(),
                    'estados_usuario': EstadoUsuario.query.count(),
                    'colores': Color.query.count(),
                    'rubros': Rubro.query.count(),
                    'usuarios': Usuario.query.count(),
                    'artesanos': Artesano.query.count()
                }
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 SISTEMA DE FERIAS - MYSQL")
    print("=" * 60)
    print("📊 Endpoints disponibles:")
    print("   http://localhost:5000/api/test-connection")
    print("   http://localhost:5000/api/init-db")
    print("   http://localhost:5000/api/status")
    print("=" * 60)
    print("💡 PRIMERO ve a: http://localhost:5000/api/test-connection")
    print("   LUEGO ve a: http://localhost:5000/api/init-db")
    print("=" * 60)
    
    app.run(debug=True, port=5000)