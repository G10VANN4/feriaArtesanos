from .base import db

class Parcela(db.Model):
    __tablename__ = 'Parcela'
    
    parcela_id = db.Column(db.Integer, primary_key=True)
    rubro_id = db.Column(db.Integer, db.ForeignKey('Rubro.rubro_id'), nullable=False)
    numero_parcela = db.Column(db.String(20), nullable=False, unique=True)
    ancho = db.Column(db.Numeric(8, 2), nullable=False)
    largo = db.Column(db.Numeric(8, 2), nullable=False)
    disponible = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'parcela_id': self.parcela_id,
            'rubro_id': self.rubro_id,
            'numero_parcela': self.numero_parcela,
            'ancho': float(self.ancho),
            'largo': float(self.largo),
            'disponible': self.disponible
        }
    
    def __repr__(self):
        return f'<Parcela {self.numero_parcela}>'