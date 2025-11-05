from .base import db
from datetime import datetime
from sqlalchemy.dialects.mysql import LONGTEXT
class SolicitudFoto(db.Model):
    __tablename__ = 'Solicitud_Foto'
    
    foto_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id', ondelete='CASCADE'), nullable=False)
    base64 = db.Column(db.LargeBinary().with_variant(LONGTEXT, 'mysql'))
    extension = db.Column(db.String(10), nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'foto_id': self.foto_id,
            'solicitud_id': self.solicitud_id,
            'base64': self.base64,
            'extension': self.extension,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None
        }
    
    def get_image_url(self):
        """Reconstruye el Data URL completo cuando se necesite"""
        return f"data:image/{self.extension};base64,{self.base64}"
    
    def __repr__(self):
        return f'<SolicitudFoto {self.foto_id}>'