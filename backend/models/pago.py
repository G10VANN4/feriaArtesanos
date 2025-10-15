from .base import db
from datetime import datetime

class Pago(db.Model):
    __tablename__ = 'Pago'
    pago_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), unique=True, nullable=False)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    estado_pago_id = db.Column(db.Integer, db.ForeignKey('EstadoPago.estado_pago_id'), nullable=False)
    fecha_pago = db.Column(db.DateTime)
    referencia_mercado_pago = db.Column(db.String(100))
    comprobante_url = db.Column(db.String(500))
    parcelas_calculadas = db.Column(db.Integer)
    confirmado_automaticamente = db.Column(db.Boolean, default=False)
    fecha_confirmacion = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'pago_id': self.pago_id,
            'solicitud_id': self.solicitud_id,
            'monto': float(self.monto) if self.monto else None,
            'estado_pago_id': self.estado_pago_id,
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'referencia_mercado_pago': self.referencia_mercado_pago,
            'comprobante_url': self.comprobante_url,
            'parcelas_calculadas': self.parcelas_calculadas,
            'confirmado_automaticamente': self.confirmado_automaticamente,
            'fecha_confirmacion': self.fecha_confirmacion.isoformat() if self.fecha_confirmacion else None
        }