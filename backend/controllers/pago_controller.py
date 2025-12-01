# controllers/pago_controller.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.pago import Pago
from models.solicitud import Solicitud
from models.artesano import Artesano
from models.estado_pago import EstadoPago
from models.usuario import Usuario
from models.rubro import Rubro
import mercadopago
import os
from datetime import datetime

pago_bp = Blueprint("pago", __name__, url_prefix="/api/v1/pago")

# -------------------------------------------
#   SDK de MercadoPago (con validación)
# -------------------------------------------
ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")

if not ACCESS_TOKEN:
    raise Exception("ERROR: Falta MERCADOPAGO_ACCESS_TOKEN en el .env")

mp = mercadopago.SDK(ACCESS_TOKEN)


# -------------------------------------------------
# 1) Crear Preferencia de MercadoPago
# -------------------------------------------------
@pago_bp.route("/crear-preferencia", methods=['POST'])
@jwt_required()
def crear_preferencia():
    try:
        data = request.get_json()
        parcelas_seleccionadas = data.get('parcelas_seleccionadas', []) if data else []
        print(f"🔍 Parcelas recibidas del frontend: {len(parcelas_seleccionadas)}")

        print("🔍 DEBUG - Variables de entorno:")
        print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL')}")
        print(f"MP_WEBHOOK: {os.getenv('MP_WEBHOOK')}")
        print(f"🔍 Parcelas recibidas del frontend: {len(parcelas_seleccionadas)}")
        
        # Obtener el identity como string y extraer el ID
        user_identity = get_jwt_identity()  # "user_123"
        usuario_id = int(user_identity.split('_')[1])
        usuario = Usuario.query.get(usuario_id)

        print(f"3. Usuario ID: {usuario_id}, Usuario encontrado: {usuario is not None}")
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Verificar que el usuario sea artesano (rol_id = 1)
        if usuario.rol_id != 1:
            return jsonify({"error": "Solo los artesanos pueden realizar pagos"}), 403
        
        print("4. Usuario es artesano")

        # Buscar artesano según usuario
        artesano = Artesano.query.filter_by(usuario_id=usuario_id).first()
        if not artesano:
            return jsonify({
                "error": "Perfil de artesano incompleto", 
                "detalle": "Debes completar tu registro como artesano antes de realizar pagos"
            }), 404

        # Buscar solicitud activa del artesano
        solicitud = Solicitud.query.filter_by(artesano_id=artesano.artesano_id).first()
        print(f"6. Solicitud encontrada: {solicitud is not None}")
        if not solicitud:
            return jsonify({"error": "No tenés una solicitud activa"}), 404
        
        # Obtener el rubro actual para tener el precio más reciente
        rubro = Rubro.query.get(solicitud.rubro_id)
        print(f"7. Rubro encontrado: {rubro is not None}, Precio: {rubro.precio_parcela if rubro else 'N/A'}")
        if not rubro:
            return jsonify({"error": "Rubro no encontrado"}), 404
        
        # USAR las parcelas seleccionadas del frontend
        parcelas_count = len(parcelas_seleccionadas)
        if parcelas_count == 0:
            return jsonify({"error": "No se recibieron parcelas seleccionadas"}), 400

        precio_actual = float(rubro.precio_parcela)
        monto = float(solicitud.costo_total)

        print(f"8. Monto calculado: {monto}")

        print(f"🔍 Debug - Cálculo de monto:")
        print(f"   Parcelas necesarias: {parcelas_count}")
        print(f"   Precio actual rubro: {precio_actual}")
        print(f"   Monto calculado: {monto}")
        print(f"   Costo total en BD: {solicitud.costo_total}")

        if monto <= 0:
            return jsonify({
                "error": "No hay monto a pagar",
                "detalle": f"El cálculo resultó en monto 0. Parcelas: {parcelas_count}, Precio: {precio_actual}"
            }), 400
        
        print("9. Buscando pago existente...")

        # Verificar si ya existe un pago
        pago_existente = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
        
        if pago_existente:
            print(f"🔍 PAGO EXISTENTE ENCONTRADO:")
            print(f"   - Estado ID: {pago_existente.estado_pago_id}")
            
            # Solo bloquear si está Pendiente (1) o Pagado (2)
            if pago_existente.estado_pago_id in [1, 2]:
                estado = EstadoPago.query.get(pago_existente.estado_pago_id)
                estado_nombre = estado.tipo if estado else f"Estado {pago_existente.estado_pago_id}"
                
                print(f"❌ BLOQUEADO - Estado {pago_existente.estado_pago_id} ({estado_nombre})")
                return jsonify({
                    "error": "Ya tenés un pago generado",
                    "detalle": f"Tu pago anterior está en estado: {estado_nombre}",
                    "pago_id": pago_existente.pago_id,
                    "estado_actual": estado_nombre
                }), 400
            else:
                print(f"✅ PERMITIENDO - Estado {pago_existente.estado_pago_id} (Rechazado/Cancelado)")

        print("✅ PASÓ TODAS LAS VALIDACIONES - Creando preferencia MP...")

        if monto <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0"}), 400

        print(f"💰 Monto a pagar: {monto}")

        # DEBUG DETALLADO del pago existente
        pago_existente = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
        if pago_existente:
            print(f"10. PAGO EXISTENTE ENCONTRADO:")
            print(f"   - Pago ID: {pago_existente.pago_id}")
            print(f"   - Estado Pago ID: {pago_existente.estado_pago_id}")
            print(f"   - Preference ID: {pago_existente.preference_id}")
            print(f"   - Monto: {pago_existente.monto}")
            print(f"   - Fecha creación: {pago_existente.fecha_creacion}")
            print(f"   - Fecha pago: {pago_existente.fecha_pago}")
            
            # Obtener el nombre del estado para mejor debug
            estado = EstadoPago.query.get(pago_existente.estado_pago_id)
            estado_nombre = estado.nombre if estado else "Desconocido"
            print(f"   - Estado: {estado_nombre}")
        else:
            print("10. NO hay pago existente")

        if pago_existente and pago_existente.estado_pago_id != 2:  # 2 = aprobado
            estado = EstadoPago.query.get(pago_existente.estado_pago_id)
            estado_nombre = estado.nombre if estado else "Desconocido"
            
            print("11. Entrando en error de pago existente no aprobado")
            return jsonify({
                "error": "Ya tenés un pago generado",
                "detalle": f"Tu pago anterior está en estado: {estado_nombre}",
                "pago_id": pago_existente.pago_id,
                "estado_actual": estado_nombre
            }), 400
        
        print("12. Creando preferencia de MercadoPago...")

        # Crear preferencia de MercadoPago
        print("🎯 CONFIGURACIÓN FINAL MP:")
        print(f"   - Token SANDBOX: {ACCESS_TOKEN.startswith('TEST-')}")
        print(f"   - Preferencia para: {parcelas_count} parcelas")
        print(f"   - Monto: {monto}")
        print(f"   - URLs configuradas correctamente")
        preference_data = {
            "items": [
                {
                    "title": f"Reserva de {parcelas_count} parcelas - {rubro.tipo}",
                    "quantity": 1,
                    "currency_id": "ARS",
                    "unit_price": float(monto)
                }
            ],
            "notification_url": "http://localhost:5000/api/v1/pago/webhook",
            "back_urls": {
                "success": "http://localhost:5173/pago-exitoso",
                "failure": "http://localhost:5173/pago-error",
                "pending": "http://localhost:5173/pago-pendiente",
            },
            
        }

        preference_response = mp.preference().create(preference_data)
        pref = preference_response["response"]
        print(f"🔍 Respuesta COMPLETA de MP: {preference_response}")

        # Verificar si la respuesta tiene error
        if "error" in preference_response:
            print(f"❌ Error de MP: {preference_response['error']}")
            return jsonify({"error": "Error en MercadoPago", "detalle": preference_response['error']}), 500
        
        # Verificar que la respuesta tenga la estructura esperada
        if "response" not in preference_response:
            print(f"❌ Respuesta inesperada de MP: {preference_response}")
            return jsonify({"error": "Respuesta inesperada de MercadoPago"}), 500

        pref = preference_response["response"]
        print(f"🎯 Preferencia MP creada: {pref.get('id', 'No ID')}")

        # Verificar que tenga los campos necesarios
        if "id" not in pref:
            print(f"❌ No hay 'id' en la respuesta: {pref}")
            return jsonify({"error": "MercadoPago no devolvió un ID de preferencia"}), 500

        # Guardar pago
        pago = Pago(
            solicitud_id=solicitud.solicitud_id,
            monto=monto,
            estado_pago_id=1,
            preference_id=pref["id"],
            init_point=pref["init_point"] or pref.get("sandbox_init_point", ""),
            fecha_creacion=datetime.now(),
            payment_id=None,
            fecha_pago=None
        )

        db.session.add(pago)
        db.session.commit()

        print("✅ Pago guardado en BD exitosamente")

        return jsonify({
            "preference_id": pref["id"],
            "init_point": pref["init_point"],
            "sandbox_init_point": pref.get("sandbox_init_point", ""),  # Para pruebas
            "monto": monto,
            "parcelas": parcelas_count
        }), 200

    except Exception as e:
        print(f"❌ Error completo: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()  # rollback en caso de error
        return jsonify({"error": f"Error al crear preferencia: {str(e)}"}), 500


# -------------------------------------------------
# 2) Webhook de MercadoPago
# -------------------------------------------------
@pago_bp.route("/webhook", methods=['POST'])
def pago_webhook():
    try:
        data = request.get_json()
        
        print(f"📨 Webhook recibido: {data}")
        
        if not data:
            return jsonify({"error": "No data received"}), 400

        if data.get("type") != "payment":
            return "ok", 200

        payment_id = data["data"]["id"]

        # Obtener info del pago desde MercadoPago
        payment_info = mp.payment().get(payment_id)
        
        if "response" not in payment_info:
            print(f"❌ Respuesta inválida de MP: {payment_info}")
            return "ok", 200
            
        response = payment_info["response"]
        status = response.get("status")
        preference_id = response.get("preference_id")
        
        if not preference_id:
            print(f"❌ No preference_id en la respuesta: {response}")
            return "ok", 200

        # Buscar el pago en la base de datos
        pago = Pago.query.filter_by(preference_id=preference_id).first()
        if not pago:
            print(f"❌ Pago no encontrado para preference_id: {preference_id}")
            return "ok", 200

        # Actualizar información del pago
        pago.payment_id = payment_id
        pago.fecha_pago = datetime.now()

        # Mapear estados de MercadoPago
        estado_map = {
            "approved": 2,      # aprobado
            "pending": 1,       # pendiente
            "rejected": 3,      # rechazado
            "cancelled": 4,     # cancelado
        }
        
        pago.estado_pago_id = estado_map.get(status, 4)

        # Si el pago fue aprobado, actualizar el estado de la solicitud
        if status == "approved":
            solicitud = Solicitud.query.get(pago.solicitud_id)
            if solicitud:
                solicitud.estado_id = 2  # Estado "pagado"
                print(f"✅ Solicitud {solicitud.solicitud_id} marcada como pagada")

        db.session.commit()
        print(f"✅ Pago {payment_id} actualizado a estado: {status}")
        
        return "ok", 200

    except Exception as e:
        print(f"❌ Error en webhook: {str(e)}")
        db.session.rollback()
        return "error", 500



# -------------------------------------------------
# 3) Consultar estado del pago
# -------------------------------------------------
@pago_bp.route("/estado", methods=['GET'])
@jwt_required()
def verificar_estado_pago():
    user_id = get_jwt_identity()

    artesano = Artesano.query.filter_by(usuario_id=user_id).first()
    if not artesano:
        return jsonify({"error": "No sos artesano registrado"}), 404

    solicitud = Solicitud.query.filter_by(artesano_id=artesano.artesano_id).first()
    if not solicitud:
        return jsonify({"estado": "sin_solicitud"}), 200

    pago = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
    if not pago:
        return jsonify({"estado": "sin_pago"}), 200

    return jsonify({
        "estado": pago.estado_pago.tipo,
        "estado_id": pago.estado_pago_id,
        "payment_id": pago.payment_id,
        "preference_id": pago.preference_id
    }), 200

#debug
@pago_bp.route("/test")
def test():
    return {"status": "pago_bp working"}, 200

@pago_bp.before_request
def log_requests():
    print(f"📨 Request recibida: {request.method} {request.path}")

@pago_bp.route("/debug-identity", methods=['GET'])
@jwt_required()
def debug_identity():
    """Endpoint temporal para ver qué devuelve get_jwt_identity()"""
    current_user = get_jwt_identity()
    
    # Buscar artesano
    artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
    
    return jsonify({
        "jwt_identity": current_user,
        "user_id_from_token": current_user['id'],
        "artesano_exists": artesano is not None,
        "artesano_data": artesano.to_dict() if artesano else None
    }), 200

@pago_bp.route("/debug-token", methods=['GET'])
@jwt_required()
def debug_token():
    """Para ver qué contiene realmente el token"""
    identity = get_jwt_identity()
    return jsonify({
        "identity": identity,
        "type": type(identity).__name__,
        "is_string": isinstance(identity, str),
        "is_dict": isinstance(identity, dict)
    })