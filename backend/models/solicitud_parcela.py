from .base import db
from datetime import datetime

class SolicitudParcela(db.Model):
    __tablename__ = 'Solicitud_Parcela'
    solicitud_parcela_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False)
    parcela_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'), nullable=False)
    fecha_asignacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'solicitud_parcela_id': self.solicitud_parcela_id,
            'solicitud_id': self.solicitud_id,
            'parcela_id': self.parcela_id,
            'fecha_asignacion': self.fecha_asignacion.isoformat() if self.fecha_asignacion else None
        }