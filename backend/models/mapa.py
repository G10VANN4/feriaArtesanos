from .base import db

class Mapa(db.Model):
    __tablename__ = 'Mapa'
    
    mapa_id = db.Column(db.Integer, primary_key=True)
    cant_total_filas = db.Column(db.Integer, nullable=False)
    cant_total_columnas = db.Column(db.Integer, nullable=False)

    parcelas = db.relationship('Parcela', backref='mapa', lazy=True)

    def to_dict(self):
        return {
            'mapa_id': self.mapa_id,
            'cant_total_filas': self.cant_total_filas,
            'cant_total_columnas': self.cant_total_columnas
        }
