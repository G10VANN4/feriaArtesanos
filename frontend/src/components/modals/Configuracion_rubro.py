# models/configuracion_rubro.py
from .base import db
from datetime import datetime

class ConfiguracionRubro(db.Model):
    __tablename__ = 'configuraciones_rubros'
    
    configuracion_id = db.Column(db.Integer, primary_key=True)
    rubro_id = db.Column(db.Integer, db.ForeignKey('rubros.rubro_id'), nullable=False, unique=True)
    precio_base = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    limite_puestos = db.Column(db.Integer, nullable=True)
    administrador_id = db.Column(db.Integer, db.ForeignKey('administradores.administrador_id'), nullable=False)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    rubro_rel = db.relationship('Rubro', backref=db.backref('configuracion_rel', uselist=False))
    administrador_rel = db.relationship('Administrador', backref=db.backref('configuraciones_rubros', lazy=True))
    
    def __init__(self, rubro_id, precio_base=0.00, limite_puestos=None, administrador_id=None):
        self.rubro_id = rubro_id
        self.precio_base = precio_base
        self.limite_puestos = limite_puestos
        self.administrador_id = administrador_id
    
    def to_dict(self):
        return {
            'configuracion_id': self.configuracion_id,
            'rubro_id': self.rubro_id,
            'precio_base': float(self.precio_base),
            'limite_puestos': self.limite_puestos,
            'administrador_id': self.administrador_id,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None
        }