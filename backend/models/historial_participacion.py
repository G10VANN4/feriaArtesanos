from .base import db
from datetime import datetime

class HistorialParticipacion(db.Model):
    __tablename__ = 'Historial_Participacion'
    historial_id = db.Column(db.Integer, primary_key=True)
    artesano_id = db.Column(db.Integer, db.ForeignKey('Artesano.artesano_id'), nullable=False)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), unique=True, nullable=False)
    fecha_participacion = db.Column(db.Date, nullable=False)
    parcelas_utilizadas = db.Column(db.Integer)
    costo_pagado = db.Column(db.Numeric(10, 2))
    
    def to_dict(self):
        return {
            'historial_id': self.historial_id,
            'artesano_id': self.artesano_id,
            'solicitud_id': self.solicitud_id,
            'fecha_participacion': self.fecha_participacion.isoformat() if self.fecha_participacion else None,
            'parcelas_utilizadas': self.parcelas_utilizadas,
            'costo_pagado': float(self.costo_pagado) if self.costo_pagado else None
        }