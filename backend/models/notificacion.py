from .base import db
from datetime import datetime

class Notificacion(db.Model):
    __tablename__ = 'Notificacion'
    notificacion_id = db.Column(db.Integer, primary_key=True)
    artesano_id = db.Column(db.Integer, db.ForeignKey('Artesano.artesano_id'), nullable=False)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'))
    mensaje = db.Column(db.Text, nullable=False)
    fecha_envio = db.Column(db.DateTime, default=datetime.utcnow)
    leido = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'notificacion_id': self.notificacion_id,
            'artesano_id': self.artesano_id,
            'solicitud_id': self.solicitud_id,
            'mensaje': self.mensaje,
            'fecha_envio': self.fecha_envio.isoformat() if self.fecha_envio else None,
            'leido': self.leido
        }