from .base import db

class EstadoPago(db.Model):
    __tablename__ = 'EstadoPago'
    estado_pago_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), unique=True, nullable=False)
    es_activo = db.Column(db.Boolean, default=True)
    
    # Relaciones
    pagos = db.relationship('Pago', backref='estado_pago', lazy=True)
    
    def to_dict(self):
        return {
            'estado_pago_id': self.estado_pago_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }