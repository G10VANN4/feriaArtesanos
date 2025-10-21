from .base import db
from datetime import datetime

class Notificacion(db.Model):
    __tablename__ = 'Notificacion'
    notificacion_id = db.Column(db.Integer, primary_key=True)
    artesano_id = db.Column(db.Integer, db.ForeignKey('Artesano.artesano_id'), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    fecha_envio = db.Column(db.DateTime, default=datetime.utcnow)
    estado_notificacion_id = db.Column(db.Integer, db.ForeignKey('EstadoNotificacion.estado_notificacion_id'), nullable=False)  
    leido = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'notificacion_id': self.notificacion_id,
            'artesano_id': self.artesano_id,
            'mensaje': self.mensaje,
            'fecha_envio': self.fecha_envio.isoformat() if self.fecha_envio else None,
            'estado_notificacion_id': self.estado_notificacion_id, 
            'leido': self.leido
        }