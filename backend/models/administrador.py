from .base import db
from datetime import datetime

class Administrador(db.Model):
    __tablename__ = 'Administrador'
    administrador_id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'), unique=True, nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    creado_por = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'))
    activo = db.Column(db.Boolean, default=True)
    
    # Relaciones
    solicitudes_gestionadas = db.relationship('Solicitud', backref='administrador', lazy=True)
    
    def __repr__(self):
        return f'<Administrador {self.administrador_id}>'
    
    def to_dict(self):
        return {
            'administrador_id': self.administrador_id,
            'usuario_id': self.usuario_id,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'activo': self.activo
        }