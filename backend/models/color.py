# models/color.py
from .base import db

class Color(db.Model):
    __tablename__ = 'Color'
    
    color_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)
    codigo_hex = db.Column(db.String(7))
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'color_id': self.color_id,
            'nombre': self.nombre,
            'codigo_hex': self.codigo_hex,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<Color {self.nombre}>'