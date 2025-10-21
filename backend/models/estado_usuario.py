from .base import db

class EstadoUsuario(db.Model):
    __tablename__ = 'EstadoUsuario'
    estado_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), unique=True, nullable=False)
    es_activo = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<EstadoUsuario {self.tipo}>'
   
    def to_dict(self):
        return {
            'estado_id': self.estado_id,
            'tipo': self.tipo,
            'es_activo': self.es_activo
        }