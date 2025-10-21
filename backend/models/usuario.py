from .base import db
from datetime import datetime
from passlib.hash import sha256_crypt
from .rol import Rol
from models.estado_usuario import EstadoUsuario


class Usuario(db.Model):
    __tablename__ = 'Usuario'
    usuario_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    contraseña = db.Column(db.String(255), nullable=False)
    rol_id = db.Column(db.Integer, db.ForeignKey('Rol.rol_id'), nullable=False)
    estado_id = db.Column(db.Integer, db.ForeignKey('EstadoUsuario.estado_id'), nullable=False) 
    fecha_registro = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Relaciones 1:1
    artesano = db.relationship('Artesano', backref='usuario', uselist=False, cascade='all, delete-orphan')
    administrador = db.relationship('Administrador', backref='usuario', uselist=False, cascade='all, delete-orphan')
    organizador = db.relationship('Organizador', backref='usuario', uselist=False, cascade='all, delete-orphan')
    
    relacion_rol = db.relationship('Rol', backref='usuarios')
    relacion_estado = db.relationship('EstadoUsuario', backref='usuarios')

    def set_password(self, password):
        self.contraseña = sha256_crypt.hash(password)

    def check_password(self, password):
        return sha256_crypt.verify(password, self.contraseña)

    def __repr__(self):
        return f'<Usuario {self.email} | Rol: {self.rol_id}>'
    
    def to_dict(self):
        return {
            'usuario_id': self.usuario_id,
            'nombre': self.nombre,
            'email': self.email, 
            'rol_id': self.rol_id,
            'estado_id': self.estado_id,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }