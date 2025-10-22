from .base import db
from passlib.hash import sha256_crypt
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = 'Usuario'
    
    usuario_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    contraseña = db.Column(db.String(255), nullable=False)
    estado_id = db.Column(db.Integer, db.ForeignKey('EstadoUsuario.estado_id'), nullable=False)
    rol_id = db.Column(db.Integer, db.ForeignKey('Rol.rol_id'), nullable=False)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    
    def set_password(self, password):
        self.contraseña = sha256_crypt.hash(password)
    
    def check_password(self, password):
        return sha256_crypt.verify(password, self.contraseña)
    
    def to_dict(self):
        return {
            'usuario_id': self.usuario_id,
            'nombre': self.nombre,
            'email': self.email,
            'estado_id': self.estado_id,
            'rol_id': self.rol_id,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }
    
    def __repr__(self):
        return f'<Usuario {self.email}>'