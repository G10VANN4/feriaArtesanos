# models/estado_pago.py
from .base import db

class EstadoPago(db.Model):
    __tablename__ = 'EstadoPago'
    
    estado_pago_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False, unique=True)
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'estado_pago_id': self.estado_pago_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<EstadoPago {self.tipo}>'