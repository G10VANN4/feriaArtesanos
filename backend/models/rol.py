from .base import db
from datetime import datetime

class Rol(db.Model):
    __tablename__ = 'Rol'
    rol_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), unique=True, nullable=False)
    es_activo = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    usuarios = db.relationship('Usuario', backref='rol', lazy=True)
    
    def __repr__(self):
        return f'<Rol {self.tipo}>'
    
    def to_dict(self):
        return {
            'rol_id': self.rol_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }