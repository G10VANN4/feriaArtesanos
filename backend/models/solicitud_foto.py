from .base import db

class SolicitudFoto(db.Model):
    __tablename__ = 'Solicitud_Foto'
    
    foto_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id', ondelete='CASCADE'), nullable=False)
    url_foto = db.Column(db.String(500), nullable=False)

    def to_dict(self):
        return {
            'foto_id': self.foto_id,
            'solicitud_id': self.solicitud_id,
            'url_foto': self.url_foto
        }
    
    def __repr__(self):
        return f'<SolicitudFoto {self.foto_id}>'