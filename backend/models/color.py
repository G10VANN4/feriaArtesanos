from .base import db

class Color(db.Model):
    __tablename__ = 'Color'
    color_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    codigo_hex = db.Column(db.String(7))
    es_activo = db.Column(db.Boolean, default=True)
    
    # Relaciones
    rubros = db.relationship('Rubro', backref='color', lazy=True)
    
    def to_dict(self):
        return {
            'color_id': self.color_id,
            'nombre': self.nombre,
            'codigo_hex': self.codigo_hex,
            'es_activo': self.es_activo
        }