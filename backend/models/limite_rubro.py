# models/limite_rubro.py
from .base import db

class LimiteRubro(db.Model):
    __tablename__ = 'LimiteRubro'
    
    limite_id = db.Column(db.Integer, primary_key=True)
    rubro_id = db.Column(db.Integer, db.ForeignKey('Rubro.rubro_id'), nullable=False)
    max_puestos = db.Column(db.Integer, nullable=False)
    fecha_vigencia = db.Column(db.Date, nullable=False)
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'limite_id': self.limite_id,
            'rubro_id': self.rubro_id,
            'max_puestos': self.max_puestos,
            'fecha_vigencia': self.fecha_vigencia.isoformat(),
            'es_activo': self.es_activo,
            'rubro': self.rubro.to_dict() if self.rubro else None
        }
    
    def __repr__(self):
        return f'<LimiteRubro {self.rubro_id} - {self.max_puestos}>'