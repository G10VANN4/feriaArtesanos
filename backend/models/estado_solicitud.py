# models/estado_solicitud.py
from .base import db

class EstadoSolicitud(db.Model):
    __tablename__ = 'EstadoSolicitud'
    
    estado_solicitud_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)
    es_activo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'estado_solicitud_id': self.estado_solicitud_id,
            'nombre': self.nombre,
            'es_activo': self.es_activo
        }
    
    def __repr__(self):
        return f'<EstadoSolicitud {self.nombre}>'