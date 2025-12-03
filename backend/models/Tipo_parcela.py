from .base import db

class Tipo_parcela(db.Model):
    __tablename__ = 'Tipo_parcela'
    
    tipo_parcela_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False, unique=True)
    es_activo = db.Column(db.Boolean, default=True)

    parcelas = db.relationship('Parcela', backref='tipo_parcela', lazy=True)

    def to_dict(self):
        return {
            'tipo_parcela_id': self.tipo_parcela_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }
