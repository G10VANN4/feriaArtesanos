from .base import db
from sqlalchemy.orm import relationship

class Artesano(db.Model):
    __tablename__ = 'Artesano'
    
    artesano_id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'), nullable=False, unique=True)
    nombre = db.Column(db.String(20), nullable=False)
    dni = db.Column(db.String(8), nullable=False, unique=True)
    telefono = db.Column(db.String(20), nullable=False)
    fecha_registro = db.Column(db.DateTime, default=db.func.current_timestamp())

    

    def to_dict(self):
        return {
            'artesano_id': self.artesano_id,
            'usuario_id': self.usuario_id,
            'nombre': self.nombre,
            'dni': self.dni,
            'telefono': self.telefono,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }
    
    def __repr__(self):
        return f'<Artesano {self.dni}>'