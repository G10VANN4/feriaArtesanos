from .base import db

class Administrador(db.Model):
    __tablename__ = 'Administrador'
    
    administrador_id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'), nullable=False, unique=True)
    nombre = db.Column(db.String(20), nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=db.func.current_timestamp())
    creado_por = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id', ondelete='SET NULL'))
    activo = db.Column(db.Boolean, default=True)
    
    
    def to_dict(self):
        return {
            'administrador_id': self.administrador_id,
            'usuario_id': self.usuario_id,
            'nombre': self.nombre,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'creado_por': self.creado_por,
            'activo': self.activo
        }
    
    def __repr__(self):
        return f'<Administrador {self.administrador_id}>'