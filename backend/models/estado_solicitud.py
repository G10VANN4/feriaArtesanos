from .base import db

class EstadoSolicitud(db.Model):
    __tablename__ = 'EstadoSolicitud'
    estado_solicitud_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    es_activo = db.Column(db.Boolean, default=True)
    
    # Relaciones
    solicitudes = db.relationship('Solicitud', backref='estado', lazy=True)
    
    def to_dict(self):
        return {
            'estado_solicitud_id': self.estado_solicitud_id,
            'nombre': self.nombre,
            'es_activo': self.es_activo
        }