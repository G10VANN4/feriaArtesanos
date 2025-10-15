from .base import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = 'Usuario'
    usuario_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    contraseña = db.Column(db.String(255), nullable=False)
    rol_id = db.Column(db.Integer, db.ForeignKey('Rol.rol_id'), nullable=False)
    activo = db.Column(db.Boolean, default=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones 1:1
    artesano = db.relationship('Artesano', backref='usuario', uselist=False, cascade='all, delete-orphan')
    administrador = db.relationship('Administrador', backref='usuario', uselist=False, cascade='all, delete-orphan')
    organizador = db.relationship('Organizador', backref='usuario', uselist=False, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Usuario {self.nombre}>'
    
    def to_dict(self):
        return {
            'usuario_id': self.usuario_id,
            'nombre': self.nombre,
            'rol_id': self.rol_id,
            'activo': self.activo,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }