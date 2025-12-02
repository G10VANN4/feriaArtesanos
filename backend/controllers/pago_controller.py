# controllers/pago_controller.py - VERSION ADAPTADA A TU SISTEMA
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.pago import Pago
from models.solicitud import Solicitud
from models.artesano import Artesano
from models.estado_pago import EstadoPago
from models.estado_solicitud import EstadoSolicitud
from models.usuario import Usuario
from models.rubro import Rubro
from models.parcela import Parcela
from models.solicitud_parcela import SolicitudParcela
import mercadopago
import os
from datetime import datetime, timedelta
import json
from sqlalchemy.exc import SQLAlchemyError

pago_bp = Blueprint("pago", __name__, url_prefix="/api/v1/pago")

# -------------------------------------------
#   SDK de MercadoPago
# -------------------------------------------
ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
mp = None

if ACCESS_TOKEN:
    try:
        mp = mercadopago.SDK(ACCESS_TOKEN)
        print(f"✅ SDK de MercadoPago inicializado. Modo: {'SANDBOX' if ACCESS_TOKEN.startswith('TEST') else 'PRODUCCIÓN'}")
    except Exception as e:
        print(f"❌ Error inicializando MercadoPago SDK: {e}")
else:
    print("⚠️ ADVERTENCIA: MERCADOPAGO_ACCESS_TOKEN no configurado. Pagos no funcionarán.")

# -------------------------------------------------
# 1) Crear Preferencia de MercadoPago - VERSIÓN MEJORADA
# -------------------------------------------------
@pago_bp.route("/crear-preferencia", methods=['POST'])
@jwt_required()
def crear_preferencia():
    if not mp:
        return jsonify({"error": "MercadoPago no configurado"}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se recibieron datos"}), 400
        
        parcelas_seleccionadas = data.get('parcelas_seleccionadas', [])
        
        print(f"🔍 Parcelas recibidas: {len(parcelas_seleccionadas)}")
        
        # Obtener usuario del token JWT
        user_identity = get_jwt_identity()
        
        # Manejar diferentes formatos de identity
        if isinstance(user_identity, dict):
            usuario_id = user_identity.get('id')
        elif isinstance(user_identity, str):
            if '_' in user_identity:
                try:
                    usuario_id = int(user_identity.split('_')[1])
                except:
                    return jsonify({"error": "Formato de token inválido"}), 401
            else:
                try:
                    usuario_id = int(user_identity)
                except:
                    return jsonify({"error": "ID de usuario inválido"}), 401
        else:
            usuario_id = user_identity
        
        # Buscar usuario
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Verificar que sea artesano
        if usuario.rol_id != 1:
            return jsonify({"error": "Solo los artesanos pueden realizar pagos"}), 403
        
        # Buscar artesano
        artesano = Artesano.query.filter_by(usuario_id=usuario_id).first()
        if not artesano:
            return jsonify({
                "error": "Perfil de artesano incompleto",
                "detalle": "Debes completar tu registro como artesano"
            }), 404
        
        # Buscar estado "Aprobada" en EstadoSolicitud
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({"error": "Estado 'Aprobada' no encontrado en el sistema"}), 500
        
        # Buscar solicitud activa aprobada
        solicitud = Solicitud.query.filter_by(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud:
            return jsonify({"error": "No tenés una solicitud activa o aprobada"}), 404
        
        print(f"🔍 Solicitud encontrada: ID {solicitud.solicitud_id}, Estado: {solicitud.estado_solicitud_id}")
        
        # Obtener rubro
        rubro = Rubro.query.get(solicitud.rubro_id)
        if not rubro:
            return jsonify({"error": "Rubro no encontrado"}), 404
        
        print(f"🔍 Rubro: {rubro.tipo}, Precio por parcela: {rubro.precio_parcela}")
        
        # Validar parcelas seleccionadas
        if not parcelas_seleccionadas:
            return jsonify({"error": "Debes seleccionar al menos una parcela"}), 400
        
        # Convertir a lista de IDs
        if isinstance(parcelas_seleccionadas[0], dict):
            parcelas_ids = [p.get('parcela_id') for p in parcelas_seleccionadas if p.get('parcela_id')]
        else:
            parcelas_ids = [int(p) for p in parcelas_seleccionadas if p]
        
        print(f"🔍 IDs de parcelas a verificar: {parcelas_ids}")
        
        if not parcelas_ids:
            return jsonify({"error": "IDs de parcelas inválidos"}), 400
        
        # Verificar que las parcelas existan
        parcelas = Parcela.query.filter(Parcela.parcela_id.in_(parcelas_ids)).all()
        
        if len(parcelas) != len(parcelas_ids):
            return jsonify({"error": "Algunas parcelas no existen"}), 400
        
        # Verificar disponibilidad usando tu sistema existente (Solicitud_Parcela)
        for parcela_id in parcelas_ids:
            # Verificar si la parcela ya está asignada a alguna solicitud aprobada
            parcela_ocupada = db.session.query(SolicitudParcela).join(
                Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
            ).join(
                EstadoSolicitud, Solicitud.estado_solicitud_id == EstadoSolicitud.estado_solicitud_id
            ).filter(
                SolicitudParcela.parcela_id == parcela_id,
                EstadoSolicitud.nombre == 'Aprobada'
            ).first()
            
            if parcela_ocupada:
                return jsonify({
                    "error": f"Parcela {parcela_id} ya está ocupada",
                    "parcela_id": parcela_id
                }), 400
            
            # Verificar que la parcela sea del mismo rubro que la solicitud
            parcela = Parcela.query.get(parcela_id)
            if parcela and parcela.rubro_id != solicitud.rubro_id:
                return jsonify({
                    "error": f"Parcela {parcela_id} no es de tu rubro",
                    "detalle": f"Tu rubro es ID {solicitud.rubro_id}, la parcela es del rubro ID {parcela.rubro_id}"
                }), 400
            
            # Verificar que la parcela esté habilitada
            if parcela and not parcela.habilitada:
                return jsonify({
                    "error": f"Parcela {parcela_id} no está habilitada",
                    "parcela_id": parcela_id
                }), 400
        
        # Calcular monto basado en precio_parcela del rubro
        precio_actual = float(rubro.precio_parcela)
        parcelas_count = len(parcelas_ids)
        monto = precio_actual * parcelas_count
        
        print(f"💰 Cálculo: {parcelas_count} parcelas × ${precio_actual} = ${monto}")
        
        if monto <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0"}), 400
        
        # Verificar si ya existe un pago para esta solicitud
        pago_existente = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
        
        if pago_existente:
            estado = EstadoPago.query.get(pago_existente.estado_pago_id)
            estado_nombre = estado.tipo if estado else "Desconocido"
            
            print(f"🔍 Pago existente encontrado: ID {pago_existente.pago_id}, Estado: {estado_nombre}")
            
            # Solo permitir nuevo pago si el anterior está rechazado o cancelado
            if pago_existente.estado_pago_id in [1, 2]:  # 1=Pendiente, 2=Aprobado
                return jsonify({
                    "error": "Ya tenés un pago generado",
                    "detalle": f"Tu pago anterior está en estado: {estado_nombre}",
                    "pago_id": pago_existente.pago_id,
                    "estado_actual": estado_nombre,
                    "estado_id": pago_existente.estado_pago_id
                }), 409
        
        # Configurar URLs
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        backend_url = os.getenv("BACKEND_URL", "http://localhost:5000")

        print(f"🔗 URLs configuradas - Frontend: {frontend_url}, Backend: {backend_url}")

        # Crear preferencia de MercadoPago - VERSIÓN MEJORADA
        expiration_date = datetime.now() + timedelta(hours=24)

        # ✅ VERSIÓN MEJORADA PARA DESARROLLO
        # En tu preference_data, CAMBIA a esto:

        preference_data = {
            "items": [
                {
                    "id": f"solicitud_{solicitud.solicitud_id}",
                    "title": f"Reserva de {parcelas_count} parcela(s) - {rubro.tipo}",
                    "description": f"Artesano: {artesano.nombre}",
                    "quantity": 1,
                    "currency_id": "ARS",
                    "unit_price": float(monto)
                }
            ],
            "payer": {
                "email": usuario.email,
                "name": f"{artesano.nombre}"
            },
            # ✅ CONFIGURACIÓN PARA PAGO FÁCIL
            "payment_methods": {
                "excluded_payment_types": [
                    {"id": "credit_card"},
                    {"id": "debit_card"},
                    {"id": "prepaid_card"}
                ],
                # DEJA SOLO efectivo
                "default_payment_method_id": "pagofacil",  # ← ESTO ES CLAVE
                "installments": 1
            },
            "back_urls": {
                "success": f"{frontend_url}/artesano-predio?mp_status=success",
                "failure": f"{frontend_url}/artesano-predio?mp_status=failure", 
                "pending": f"{frontend_url}/artesano-predio?mp_status=pending"
            },
            "notification_url": f"{backend_url}/api/v1/pago/webhook",
            "statement_descriptor": "FERIA ARTESANAL",
            "external_reference": f"solicitud_{solicitud.solicitud_id}",
            # ✅ IMPORTANTE para pagos en efectivo
            "binary_mode": False,  # Debe ser False para pagos en efectivo
            "expires": True,
            "expiration_date_from": datetime.now().isoformat(),
            "expiration_date_to": expiration_date.isoformat(),
            # ✅ ESPECIFICAR PAGO FÁCIL EXPLÍCITAMENTE
            "payment_type_id": "ticket",
            "payer_costs": [
                {
                    "installments": 1,
                    "installment_rate": 0,
                    "discount_rate": 0,
                    "labels": [],
                    "min_allowed_amount": 5,
                    "max_allowed_amount": 30000,
                    "recommended_message": "",
                    "installment_amount": float(monto),
                    "total_amount": float(monto)
                }
            ]
        }

        print(f"🎯 Enviando a MercadoPago: {json.dumps(preference_data, indent=2)}")
        
        # Crear preferencia
        try:
            preference_response = mp.preference().create(preference_data)
            print(f"🔍 Respuesta de MP: {json.dumps(preference_response, indent=2)}")
        except Exception as mp_error:
            print(f"❌ Error de MercadoPago SDK: {mp_error}")
            return jsonify({"error": "Error al conectar con MercadoPago", "detalle": str(mp_error)}), 500
        
        if "response" not in preference_response:
            print(f"❌ Respuesta inesperada de MP: {preference_response}")
            return jsonify({"error": "Respuesta inesperada de MercadoPago"}), 500
        
        pref = preference_response["response"]
        
        if "error" in pref:
            print(f"❌ Error en preferencia MP: {pref['error']}")
            return jsonify({"error": f"MercadoPago: {pref.get('message', 'Error desconocido')}"}), 500
        
        # Guardar pago en base de datos
        pago = Pago(
            solicitud_id=solicitud.solicitud_id,
            monto=monto,
            estado_pago_id=1,  # Pendiente
            preference_id=pref["id"],
            init_point=pref.get("init_point") or pref.get("sandbox_init_point", ""),
            fecha_creacion=datetime.now(),
            payment_id=None,
            fecha_pago=None,
            parcelas_calculadas=parcelas_count,
            dimension_base_calculo=float(rubro.precio_parcela)
        )
        
        # Guardar IDs de parcelas seleccionadas
        pago.set_parcelas_seleccionadas(parcelas_ids)
        
        db.session.add(pago)
        db.session.commit()
        
        print(f"✅ Pago creado en BD: ID {pago.pago_id}, Preference: {pref['id']}")
        
        # ✅ Obtener SIEMPRE sandbox_init_point en desarrollo
        init_point = ""
        
        if ACCESS_TOKEN.startswith("TEST-"):  # Modo SANDBOX
            # Priorizar sandbox_init_point
            init_point = pref.get("sandbox_init_point", "")
            
            # Si no hay sandbox_init_point, construirla manualmente
            if not init_point and "id" in pref:
                init_point = f"https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id={pref['id']}"
                print(f"🔧 URL sandbox construida manualmente: {init_point}")
        else:  # Modo PRODUCCIÓN
            init_point = pref.get("init_point", "")
        
        # Si aún no tenemos URL, usar cualquier init_point disponible
        if not init_point:
            init_point = pref.get("init_point") or pref.get("sandbox_init_point", "")
            print(f"⚠️ Usando init_point por defecto: {init_point}")
        
        print(f"🔗 URL de pago a devolver: {init_point}")
        
        return jsonify({
            "success": True,
            "message": "Preferencia creada exitosamente",
            "preference_id": pref["id"],
            "init_point": init_point,
            "monto": monto,
            "parcelas": parcelas_count,
            "pago_id": pago.pago_id,
            "sandbox": ACCESS_TOKEN.startswith("TEST-"),  # ← ESTE ES IMPORTANTE
            "qr_code": pref.get("qr_code", {}).get("base64", "") if pref.get("qr_code") else ""
        }), 200
        
    except SQLAlchemyError as db_error:
        db.session.rollback()
        print(f"❌ Error de base de datos: {db_error}")
        return jsonify({"error": "Error en la base de datos"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error completo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error al crear preferencia: {str(e)}"}), 500


# -------------------------------------------------
# 2) Webhook de MercadoPago - VERSIÓN CORREGIDA
# -------------------------------------------------
@pago_bp.route("/webhook", methods=['POST'])
def pago_webhook():
    try:
        # MercadoPago puede enviar JSON o form-data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        print(f"📨 Webhook recibido: {data}")
        
        # Extraer payment_id
        payment_id = None
        if data.get("type") == "payment":
            payment_id = data.get("data", {}).get("id")
        elif "id" in data:
            payment_id = data.get("id")
        
        if not payment_id:
            print("❌ No se pudo extraer payment_id del webhook")
            return jsonify({"status": "ok"}), 200
        
        print(f"🔍 Procesando payment_id: {payment_id}")
        
        # Obtener información del pago desde MercadoPago
        if not mp:
            print("❌ MercadoPago SDK no inicializado")
            return jsonify({"status": "ok"}), 200
        
        try:
            payment_info = mp.payment().get(payment_id)
        except Exception as mp_error:
            print(f"❌ Error obteniendo pago de MP: {mp_error}")
            return jsonify({"status": "ok"}), 200
        
        if "response" not in payment_info:
            print(f"❌ Respuesta inválida de MP: {payment_info}")
            return jsonify({"status": "ok"}), 200
        
        payment_data = payment_info["response"]
        
        # Buscar pago por preference_id
        preference_id = payment_data.get("preference_id")
        if not preference_id:
            print("❌ No hay preference_id en la respuesta")
            return jsonify({"status": "ok"}), 200
        
        pago = Pago.query.filter_by(preference_id=preference_id).first()
        if not pago:
            print(f"❌ Pago no encontrado para preference_id: {preference_id}")
            return jsonify({"status": "ok"}), 200
        
        # ✅ GUARDAR estado anterior para comparación
        estado_anterior = pago.estado_pago_id
        
        # Actualizar estado del pago
        status = payment_data.get("status")
        estado_map = {
            "approved": 2,      # aprobado
            "pending": 1,       # pendiente
            "rejected": 3,      # rechazado
            "cancelled": 4,     # cancelado
        }
        
        nuevo_estado = estado_map.get(status, 4)
        pago.estado_pago_id = nuevo_estado
        pago.payment_id = payment_id
        pago.fecha_pago = datetime.now()
        
        print(f"📊 Pago {payment_id}: {status} (anterior: {estado_anterior}, nuevo: {nuevo_estado})")
        
        # Si el pago fue aprobado Y antes NO estaba aprobado
        if status == "approved" and estado_anterior != 2:
            # Obtener IDs de parcelas seleccionadas
            parcelas_ids = pago.get_parcelas_seleccionadas()
            
            print(f"✅ PAGO APROBADO para solicitud {pago.solicitud_id}")
            print(f"🔍 Asignando parcelas: {parcelas_ids}")
            
            # Buscar estado "Pagada" o similar
            estado_pagada = EstadoSolicitud.query.filter_by(nombre='Pagada').first()
            if not estado_pagada:
                # Buscar otros estados posibles
                for estado_nombre in ['Completada', 'Parcialmente Asignada', 'Finalizada']:
                    estado_pagada = EstadoSolicitud.query.filter_by(nombre=estado_nombre).first()
                    if estado_pagada:
                        break
            
            # Actualizar estado de la solicitud si encontramos un estado apropiado
            solicitud = Solicitud.query.get(pago.solicitud_id)
            if solicitud and estado_pagada:
                estado_anterior_solicitud = solicitud.estado_solicitud_id
                solicitud.estado_solicitud_id = estado_pagada.estado_solicitud_id
                print(f"📋 Solicitud {solicitud.solicitud_id}: {estado_anterior_solicitud} → {estado_pagada.estado_solicitud_id} ({estado_pagada.nombre})")
            elif solicitud:
                print(f"⚠️ No se encontró estado 'Pagada' para actualizar solicitud {solicitud.solicitud_id}")
            
            # Crear registros en Solicitud_Parcela para asignar las parcelas
            parcelas_asignadas = 0
            for parcela_id in parcelas_ids:
                # Verificar que la parcela no esté ya asignada
                parcela_ya_asignada = db.session.query(SolicitudParcela).join(
                    Solicitud, SolicitudParcela.solicitud_id == Solicitud.solicitud_id
                ).join(
                    EstadoSolicitud, Solicitud.estado_solicitud_id == EstadoSolicitud.estado_solicitud_id
                ).filter(
                    SolicitudParcela.parcela_id == parcela_id,
                    EstadoSolicitud.nombre.in_(['Aprobada', 'Pagada', 'Completada', 'Parcialmente Asignada'])
                ).first()
                
                if not parcela_ya_asignada:
                    solicitud_parcela = SolicitudParcela(
                        solicitud_id=pago.solicitud_id,
                        parcela_id=parcela_id
                    )
                    db.session.add(solicitud_parcela)
                    parcelas_asignadas += 1
                    print(f"✅ Parcela {parcela_id} asignada a solicitud {pago.solicitud_id}")
                else:
                    print(f"⚠️ Parcela {parcela_id} ya está asignada a otra solicitud aprobada/pagada")
            
            print(f"📊 Total parcelas asignadas: {parcelas_asignadas}/{len(parcelas_ids)}")
        
        db.session.commit()
        print(f"✅ Pago {payment_id} procesado correctamente")
        
        return jsonify({"status": "ok"}), 200
        
    except Exception as e:
        print(f"❌ Error en webhook: {str(e)}")
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": "internal error"}), 500


# -------------------------------------------------
# 3) Verificar estado del pago - ADAPTADO
# -------------------------------------------------
@pago_bp.route("/estado", methods=['GET'])
@jwt_required()
def verificar_estado_pago():
    try:
        user_identity = get_jwt_identity()
        
        # Extraer usuario_id
        if isinstance(user_identity, dict):
            usuario_id = user_identity.get('id')
        elif isinstance(user_identity, str):
            if '_' in user_identity:
                usuario_id = int(user_identity.split('_')[1])
            else:
                usuario_id = int(user_identity)
        else:
            usuario_id = user_identity
        
        # Buscar artesano
        artesano = Artesano.query.filter_by(usuario_id=usuario_id).first()
        if not artesano:
            return jsonify({"estado": "sin_artesano"}), 200
        
        # Buscar estado "Aprobada"
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({"estado": "error_estado"}), 200
        
        # Buscar última solicitud aprobada
        solicitud = Solicitud.query.filter_by(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_aprobada.estado_solicitud_id
        ).order_by(Solicitud.fecha_solicitud.desc()).first()
        
        if not solicitud:
            return jsonify({"estado": "sin_solicitud"}), 200
        
        # Buscar pago más reciente
        pago = Pago.query.filter_by(
            solicitud_id=solicitud.solicitud_id
        ).order_by(Pago.fecha_creacion.desc()).first()
        
        if not pago:
            return jsonify({"estado": "sin_pago"}), 200
        
        estado = EstadoPago.query.get(pago.estado_pago_id)
        estado_solicitud = EstadoSolicitud.query.get(solicitud.estado_solicitud_id)
        
        # Verificar si ya hay parcelas asignadas a esta solicitud
        parcelas_asignadas = SolicitudParcela.query.filter_by(
            solicitud_id=solicitud.solicitud_id
        ).count()
        
        return jsonify({
            "estado_pago": estado.tipo if estado else "Desconocido",
            "estado_pago_id": pago.estado_pago_id,
            "estado_solicitud": estado_solicitud.nombre if estado_solicitud else "Desconocido",
            "estado_solicitud_id": solicitud.estado_solicitud_id,
            "payment_id": pago.payment_id,
            "preference_id": pago.preference_id,
            "init_point": pago.init_point,
            "monto": float(pago.monto) if pago.monto else 0,
            "parcelas_seleccionadas_en_pago": pago.get_parcelas_seleccionadas(),
            "parcelas_calculadas": pago.parcelas_calculadas,
            "parcelas_asignadas_actuales": parcelas_asignadas,
            "fecha_creacion": pago.fecha_creacion.isoformat() if pago.fecha_creacion else None,
            "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
            "pago_id": pago.pago_id,
            "solicitud_id": pago.solicitud_id,
            "parcelas_necesarias": solicitud.parcelas_necesarias
        }), 200
        
    except Exception as e:
        print(f"❌ Error verificando estado: {e}")
        return jsonify({"estado": "error"}), 200


# -------------------------------------------------
# 4) Reiniciar pago (para estados rechazados/cancelados) - ADAPTADO
# -------------------------------------------------
@pago_bp.route("/reiniciar-pago", methods=['POST'])
@jwt_required()
def reiniciar_pago():
    try:
        user_identity = get_jwt_identity()
        
        # Extraer usuario_id
        if isinstance(user_identity, dict):
            usuario_id = user_identity.get('id')
        elif isinstance(user_identity, str):
            if '_' in user_identity:
                usuario_id = int(user_identity.split('_')[1])
            else:
                usuario_id = int(user_identity)
        else:
            usuario_id = user_identity
        
        # Buscar artesano
        artesano = Artesano.query.filter_by(usuario_id=usuario_id).first()
        if not artesano:
            return jsonify({"error": "Artesano no encontrado"}), 404
        
        # Buscar estado "Aprobada"
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({"error": "Estado 'Aprobada' no encontrado"}), 500
        
        # Buscar solicitud
        solicitud = Solicitud.query.filter_by(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud:
            return jsonify({"error": "No tenés una solicitud aprobada"}), 404
        
        # Buscar pago
        pago = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
        if not pago:
            return jsonify({"error": "No hay pago para reiniciar"}), 404
        
        # Solo permitir reiniciar si está rechazado o cancelado
        if pago.estado_pago_id not in [3, 4]:  # 3=Rechazado, 4=Cancelado
            estado = EstadoPago.query.get(pago.estado_pago_id)
            estado_nombre = estado.tipo if estado else "Desconocido"
            return jsonify({
                "error": "No se puede reiniciar este pago",
                "detalle": f"Estado actual: {estado_nombre}",
                "estado_actual": pago.estado_pago_id
            }), 400
        
        # Eliminar pago anterior
        db.session.delete(pago)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Pago reiniciado correctamente. Ahora podés crear un nuevo pago."
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error reiniciando pago: {e}")
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------
# 5) Cancelar pago pendiente - ADAPTADO
# -------------------------------------------------
@pago_bp.route("/cancelar-pago-actual", methods=['POST'])
@jwt_required()
def cancelar_pago_actual():
    try:
        user_identity = get_jwt_identity()
        
        # Extraer usuario_id
        if isinstance(user_identity, dict):
            usuario_id = user_identity.get('id')
        elif isinstance(user_identity, str):
            if '_' in user_identity:
                usuario_id = int(user_identity.split('_')[1])
            else:
                usuario_id = int(user_identity)
        else:
            usuario_id = user_identity
        
        # Buscar artesano
        artesano = Artesano.query.filter_by(usuario_id=usuario_id).first()
        if not artesano:
            return jsonify({"error": "Artesano no encontrado"}), 404
        
        # Buscar estado "Aprobada"
        estado_aprobada = EstadoSolicitud.query.filter_by(nombre='Aprobada').first()
        if not estado_aprobada:
            return jsonify({"error": "Estado 'Aprobada' no encontrado"}), 500
        
        # Buscar solicitud
        solicitud = Solicitud.query.filter_by(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_aprobada.estado_solicitud_id
        ).first()
        
        if not solicitud:
            return jsonify({"error": "No tenés una solicitud aprobada"}), 404
        
        # Buscar pago
        pago = Pago.query.filter_by(solicitud_id=solicitud.solicitud_id).first()
        if not pago:
            return jsonify({"error": "No hay pago para cancelar"}), 404
        
        # Solo permitir cancelar si está pendiente
        if pago.estado_pago_id != 1:  # 1 = Pendiente
            estado = EstadoPago.query.get(pago.estado_pago_id)
            estado_nombre = estado.tipo if estado else "Desconocido"
            return jsonify({
                "error": "No se puede cancelar este pago",
                "detalle": f"Solo se pueden cancelar pagos pendientes. Estado actual: {estado_nombre}",
                "estado_actual": pago.estado_pago_id
            }), 400
        
        # Cambiar estado a cancelado
        pago.estado_pago_id = 4  # Cancelado
        pago.fecha_pago = datetime.now()
        
        # IMPORTANTE: NO eliminar registros de Solicitud_Parcela porque el pago está pendiente
        # Las parcelas aún no han sido asignadas formalmente
        print(f"⚠️ Pago {pago.pago_id} cancelado. No se eliminan registros de Solicitud_Parcela porque el pago estaba pendiente.")
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Pago cancelado correctamente. Ahora podés crear un nuevo pago.",
            "pago_id": pago.pago_id,
            "estado_anterior": 1,
            "estado_nuevo": 4
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error cancelando pago: {e}")
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------
# 6) Simular webhook para desarrollo - ADAPTADO
# -------------------------------------------------
@pago_bp.route("/simular-webhook/<string:preference_id>", methods=['POST'])
def simular_webhook(preference_id):
    """Endpoint para simular webhook en desarrollo"""
    if not preference_id:
        return jsonify({"error": "Se requiere preference_id"}), 400
    
    pago = Pago.query.filter_by(preference_id=preference_id).first()
    if not pago:
        return jsonify({"error": "Pago no encontrado"}), 404
    
    data = request.get_json() or {}
    estado_simulado = data.get("estado", "approved")
    
    estado_map = {
        "approved": 2,
        "pending": 1,
        "rejected": 3,
        "cancelled": 4,
    }
    
    pago.estado_pago_id = estado_map.get(estado_simulado, 2)
    pago.payment_id = f"SIMULATED_{datetime.now().timestamp()}"
    pago.fecha_pago = datetime.now()
    
    if estado_simulado == "approved":
        # Buscar estado "Pagada" o similar
        estado_pagada = EstadoSolicitud.query.filter_by(nombre='Pagada').first()
        if not estado_pagada:
            estado_pagada = EstadoSolicitud.query.filter_by(nombre='Parcialmente Asignada').first()
            if not estado_pagada:
                estado_pagada = EstadoSolicitud.query.filter_by(nombre='Completada').first()
        
        # Marcar solicitud como pagada
        solicitud = Solicitud.query.get(pago.solicitud_id)
        if solicitud and estado_pagada:
            solicitud.estado_solicitud_id = estado_pagada.estado_solicitud_id
            print(f"✅ Solicitud {solicitud.solicitud_id} marcada como {estado_pagada.nombre}")
        
        # Asignar parcelas usando tu sistema existente (Solicitud_Parcela)
        parcelas_ids = pago.get_parcelas_seleccionadas()
        print(f"🔍 Asignando parcelas: {parcelas_ids}")
        
        parcelas_asignadas = []
        for parcela_id in parcelas_ids:
            # Verificar que la parcela no esté ya asignada
            parcela_ya_asignada = SolicitudParcela.query.filter_by(
                parcela_id=parcela_id
            ).first()
            
            if not parcela_ya_asignada:
                solicitud_parcela = SolicitudParcela(
                    solicitud_id=pago.solicitud_id,
                    parcela_id=parcela_id
                )
                db.session.add(solicitud_parcela)
                parcelas_asignadas.append(parcela_id)
                print(f"✅ Parcela {parcela_id} asignada a solicitud {pago.solicitud_id}")
            else:
                print(f"⚠️ Parcela {parcela_id} ya estaba asignada a otra solicitud")
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Webhook simulado. Estado actualizado a: {estado_simulado}",
        "pago_id": pago.pago_id,
        "estado_id": pago.estado_pago_id,
        "parcelas_asignadas": parcelas_asignadas if estado_simulado == "approved" else []
    }), 200


# -------------------------------------------------
# Endpoints de debug
# -------------------------------------------------
@pago_bp.route("/debug", methods=['GET'])
@jwt_required()
def debug():
    current_user = get_jwt_identity()
    return jsonify({
        "jwt_identity": current_user,
        "type": type(current_user).__name__,
        "mp_configured": mp is not None,
        "token_type": "SANDBOX" if ACCESS_TOKEN and ACCESS_TOKEN.startswith("TEST") else "PRODUCCIÓN" if ACCESS_TOKEN else "NO CONFIGURADO"
    }), 200


@pago_bp.route("/health", methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "pago",
        "mp_sdk": "loaded" if mp else "not_loaded",
        "timestamp": datetime.now().isoformat()
    }), 200


@pago_bp.route("/test", methods=['GET'])
def test():
    return jsonify({"status": "pago_bp working"}), 200

@pago_bp.route("/aprobar-pago-facil/<string:preference_id>", methods=['POST'])
def aprobar_pago_facil(preference_id):
    """Simular aprobación de Pago Fácil en sandbox"""
    try:
        pago = Pago.query.filter_by(preference_id=preference_id).first()
        if not pago:
            return jsonify({"error": "Pago no encontrado"}), 404
        
        # Marcar como aprobado
        pago.estado_pago_id = 2  # Aprobado
        pago.payment_id = f"PAGOFACIL_{datetime.now().timestamp()}"
        pago.fecha_pago = datetime.now()
        
        # Asignar parcelas
        parcelas_ids = pago.get_parcelas_seleccionadas()
        for parcela_id in parcelas_ids:
            solicitud_parcela = SolicitudParcela(
                solicitud_id=pago.solicitud_id,
                parcela_id=parcela_id
            )
            db.session.add(solicitud_parcela)
            print(f"✅ Parcela {parcela_id} asignada")
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "✅ Pago Fácil aprobado simuladamente",
            "pago_id": pago.pago_id,
            "parcelas_asignadas": parcelas_ids
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500
    
# -------------------------------------------------
# AUTO-APROBADOR DE PAGO FÁCIL
# -------------------------------------------------
@pago_bp.route("/auto-aprobar-pago-facil/<string:preference_id>", methods=['POST'])
def auto_aprobar_pago_facil(preference_id):
    """Endpoint público para auto-aprobar pagos Pago Fácil en sandbox"""
    try:
        print(f"🔄 Intentando auto-aprobar pago con preference_id: {preference_id}")
        
        pago = Pago.query.filter_by(preference_id=preference_id).first()
        if not pago:
            print(f"❌ Pago no encontrado para preference_id: {preference_id}")
            return jsonify({"error": "Pago no encontrado"}), 404
        
        # Verificar que esté pendiente
        if pago.estado_pago_id != 1:
            print(f"ℹ️ Pago {pago.pago_id} ya tiene estado: {pago.estado_pago_id}")
            return jsonify({
                "message": f"El pago ya está en estado: {pago.estado_pago_id}",
                "estado_actual": pago.estado_pago_id
            }), 200
        
        print(f"🎯 Auto-aprobando pago Pago Fácil: {pago.pago_id}, Monto: ${pago.monto}")
        
        # MARCAR COMO APROBADO
        pago.estado_pago_id = 2  # Aprobado
        pago.payment_id = f"AUTO_PF_{datetime.now().timestamp()}"
        pago.fecha_pago = datetime.now()
        
        # ASIGNAR PARCELAS
        parcelas_ids = pago.get_parcelas_seleccionadas()
        parcelas_asignadas = []
        
        for parcela_id in parcelas_ids:
            # Verificar que no esté ya asignada
            parcela_ya_asignada = SolicitudParcela.query.filter_by(
                parcela_id=parcela_id
            ).first()
            
            if not parcela_ya_asignada:
                solicitud_parcela = SolicitudParcela(
                    solicitud_id=pago.solicitud_id,
                    parcela_id=parcela_id
                )
                db.session.add(solicitud_parcela)
                parcelas_asignadas.append(parcela_id)
                print(f"✅ Parcela {parcela_id} asignada")
            else:
                print(f"⚠️ Parcela {parcela_id} ya estaba asignada")
        
        # Actualizar estado de la solicitud si existe estado "Pagada"
        estado_pagada = EstadoSolicitud.query.filter_by(nombre='Pagada').first()
        if not estado_pagada:
            estado_pagada = EstadoSolicitud.query.filter_by(nombre='Completada').first()
        
        if estado_pagada:
            solicitud = Solicitud.query.get(pago.solicitud_id)
            if solicitud:
                solicitud.estado_solicitud_id = estado_pagada.estado_solicitud_id
                print(f"📋 Solicitud {solicitud.solicitud_id} marcada como {estado_pagada.nombre}")
        
        db.session.commit()
        
        print(f"✅ Pago {pago.pago_id} auto-aprobado exitosamente")
        
        return jsonify({
            "success": True,
            "message": "✅ Pago Fácil auto-aprobado exitosamente",
            "pago_id": pago.pago_id,
            "estado": "Aprobado",
            "parcelas_asignadas": parcelas_asignadas,
            "monto": float(pago.monto),
            "referencia": preference_id[-8:]  # Últimos 8 chars como referencia
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error auto-aprobando pago: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# -------------------------------------------------
# VERIFICAR Y AUTO-APROBAR
# -------------------------------------------------
@pago_bp.route("/check-and-auto-approve/<string:preference_id>", methods=['GET'])
@jwt_required()
def check_and_auto_approve(preference_id):
    """Verifica un pago y si está pendiente > 1 minuto, lo auto-aprueba"""
    try:
        pago = Pago.query.filter_by(preference_id=preference_id).first()
        if not pago:
            return jsonify({"error": "Pago no encontrado"}), 404
        
        # Si ya está aprobado, devolver info
        if pago.estado_pago_id == 2:
            return jsonify({
                "status": "already_approved",
                "message": "El pago ya está aprobado",
                "pago_id": pago.pago_id,
                "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None
            }), 200
        
        # Si está pendiente y tiene más de 1 minuto, auto-aprobar
        tiempo_creacion = pago.fecha_creacion
        tiempo_actual = datetime.now()
        diferencia = tiempo_actual - tiempo_creacion
        
        if diferencia.total_seconds() > 60:  # Más de 1 minuto
            print(f"⏰ Pago pendiente por {diferencia.total_seconds():.0f} segundos - auto-aprobando")
            
            # Llamar al endpoint de auto-aprobación
            import requests
            auto_approve_url = f"http://localhost:5000/api/v1/pago/auto-aprobar-pago-facil/{preference_id}"
            
            try:
                response = requests.post(auto_approve_url, timeout=10)
                if response.status_code == 200:
                    return jsonify({
                        "status": "auto_approved",
                        "message": "✅ Pago auto-aprobado exitosamente",
                        "pago_id": pago.pago_id
                    }), 200
            except Exception as api_error:
                print(f"❌ Error llamando a auto-aprobar: {api_error}")
        
        # Si aún no pasó 1 minuto, devolver tiempo restante
        segundos_restantes = 60 - diferencia.total_seconds()
        if segundos_restantes < 0:
            segundos_restantes = 0
        
        return jsonify({
            "status": "pending",
            "message": f"Pago aún pendiente. Se auto-aprobará en {int(segundos_restantes)} segundos",
            "tiempo_creacion": tiempo_creacion.isoformat(),
            "segundos_transcurridos": diferencia.total_seconds(),
            "segundos_para_autoaprobacion": segundos_restantes
        }), 200
        
    except Exception as e:
        print(f"❌ Error en check-and-auto-approve: {e}")
        return jsonify({"error": str(e)}), 500
    
