from .base import db

class Rubro(db.Model):
    __tablename__ = 'Rubro'
    
    rubro_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False, unique=True)
    precio_parcela = db.Column(db.Numeric(10, 2), nullable=False)
    color_id = db.Column(db.Integer, db.ForeignKey('Color.color_id'), nullable=False)
    es_activo = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'rubro_id': self.rubro_id,
            'tipo': self.tipo,
            'precio_parcela': float(self.precio_parcela),
            'color_id': self.color_id,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<Rubro {self.tipo}>'