# models/rol.py
from .base import db

class Rol(db.Model):
    __tablename__ = 'Rol'
    
    rol_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False, unique=True)
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'rol_id': self.rol_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<Rol {self.tipo}>'