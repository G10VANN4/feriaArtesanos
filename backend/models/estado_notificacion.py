# models/estado_notificacion.py
from .base import db

class EstadoNotificacion(db.Model):
    __tablename__ = 'EstadoNotificacion'
    
    estado_notificacion_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'estado_notificacion_id': self.estado_notificacion_id,
            'nombre': self.nombre,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<EstadoNotificacion {self.nombre}>'