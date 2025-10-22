from .base import db

class HistorialParticipacion(db.Model):
    __tablename__ = 'Historial_Participacion'
    
    historial_participacion_id = db.Column(db.Integer, primary_key=True)
    artesano_id = db.Column(db.Integer, db.ForeignKey('Artesano.artesano_id'), nullable=False)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False)
    
    def to_dict(self):
        return {
            'historial_participacion_id': self.historial_participacion_id,
            'artesano_id': self.artesano_id,
            'solicitud_id': self.solicitud_id
        }
    
    def __repr__(self):
        return f'<HistorialParticipacion A:{self.artesano_id} S:{self.solicitud_id}>'