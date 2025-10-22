from .base import db

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

    
    def to_dict(self):
        return {
            'pago_id': self.pago_id,
            'solicitud_id': self.solicitud_id,
            'monto': float(self.monto) if self.monto else None,
            'estado_pago_id': self.estado_pago_id,
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'comprobante': self.comprobante,
            'parcelas_calculadas': self.parcelas_calculadas,
            'dimension_base_calculo': float(self.dimension_base_calculo) if self.dimension_base_calculo else None
        }
    
    def __repr__(self):
        return f'<Pago {self.pago_id}>'