# models/pago.py
from .base import db
from datetime import datetime
import json

class Pago(db.Model):
    __tablename__ = 'Pago'
    
    pago_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False, unique=True)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    estado_pago_id = db.Column(db.Integer, db.ForeignKey('EstadoPago.estado_pago_id'), nullable=False)
    fecha_pago = db.Column(db.DateTime)
    comprobante = db.Column(db.String(500))
    parcelas_calculadas = db.Column(db.Integer)
    dimension_base_calculo = db.Column(db.Numeric(8, 2))
    
    # NUEVA COLUMNA: Almacena las parcelas seleccionadas como JSON
    parcelas_seleccionadas = db.Column(db.JSON, nullable=True)  # <-- COLUMNA NUEVA
    
    # Campos para Mercado Pago
    preference_id = db.Column(db.String(255), unique=True, nullable=True)
    payment_id = db.Column(db.String(255), unique=True, nullable=True)
    init_point = db.Column(db.Text)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    solicitud = db.relationship('Solicitud', backref=db.backref('pago', uselist=False))
    estado_pago = db.relationship('EstadoPago', backref='pagos')
    
    def to_dict(self):
        """Convierte el objeto a diccionario para JSON"""
        return {
            'pago_id': self.pago_id,
            'solicitud_id': self.solicitud_id,
            'monto': float(self.monto) if self.monto else None,
            'estado_pago_id': self.estado_pago_id,
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'comprobante': self.comprobante,
            'parcelas_calculadas': self.parcelas_calculadas,
            'dimension_base_calculo': float(self.dimension_base_calculo) if self.dimension_base_calculo else None,
            
            # Campo nuevo - devuelve como lista o None
            'parcelas_seleccionadas': self.get_parcelas_seleccionadas(),
            
            'preference_id': self.preference_id,
            'payment_id': self.payment_id,
            'init_point': self.init_point,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            
            # Información relacionada (útil para frontend)
            'estado_pago_nombre': self.estado_pago.tipo if self.estado_pago else None
        }
    
    def get_parcelas_seleccionadas(self):
        """Devuelve las parcelas seleccionadas como lista Python"""
        if self.parcelas_seleccionadas:
            try:
                # Si es string (caso MySQL TEXT), parsear JSON
                if isinstance(self.parcelas_seleccionadas, str):
                    return json.loads(self.parcelas_seleccionadas)
                # Si ya es lista/dict (caso MySQL JSON), devolver directo
                return self.parcelas_seleccionadas
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    def set_parcelas_seleccionadas(self, parcelas_list):
        """Guarda una lista de IDs de parcelas"""
        if parcelas_list and isinstance(parcelas_list, list):
            self.parcelas_seleccionadas = parcelas_list
        else:
            self.parcelas_seleccionadas = None
    
    def __repr__(self):
        return f'<Pago {self.pago_id} - ${self.monto} - Estado: {self.estado_pago.tipo if self.estado_pago else "Sin estado"}>'