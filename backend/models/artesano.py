from .base import db
from datetime import datetime

class Artesano(db.Model):
    __tablename__ = 'Artesano'
    artesano_id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    dni = db.Column(db.String(8), nullable=False, default="PENDIENTE")
    telefono = db.Column(db.String(20), nullable=False, default="PENDIENTE")
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    solicitudes = db.relationship('Solicitud', backref='artesano', lazy=True)
    
    def __repr__(self):
        return f'<Artesano {self.email}>'
    
    def to_dict(self):
        return {
            'artesano_id': self.artesano_id,
            'usuario_id': self.usuario_id,
            'email': self.email,
            #llena hasta ahi en el login normal, los otros se cargan en el formulario de la solicitud
            'dni': self.dni,
            'telefono': self.telefono,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'perfil_completo': self.dni != "PENDIENTE" and self.telefono != "PENDIENTE"
        }