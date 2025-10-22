from .base import db

class SolicitudParcela(db.Model):
    __tablename__ = 'Solicitud_Parcela'
    
    solicitud_parcela_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False)
    parcela_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'), nullable=False)

    
    def to_dict(self):
        return {
            'solicitud_parcela_id': self.solicitud_parcela_id,
            'solicitud_id': self.solicitud_id,
            'parcela_id': self.parcela_id
        }
    
    def __repr__(self):
        return f'<SolicitudParcela S:{self.solicitud_id} P:{self.parcela_id}>'