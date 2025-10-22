from .base import db

class GridCuadrado(db.Model):
    __tablename__ = 'Grid_Cuadrado'
    
    cuadrado_id = db.Column(db.Integer, primary_key=True)
    config_id = db.Column(db.Integer, db.ForeignKey('Configuracion_Grid.config_id'), nullable=False)
    posicion_x = db.Column(db.Integer, nullable=False)
    posicion_y = db.Column(db.Integer, nullable=False)
    estado = db.Column(db.Enum('disponible', 'bloqueado', 'reservado'), default='disponible')
    parcela_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'), nullable=False, unique=True)
    admin_bloqueo_id = db.Column(db.Integer, db.ForeignKey('Usuario.usuario_id'))

    def to_dict(self):
        return {
            'cuadrado_id': self.cuadrado_id,
            'config_id': self.config_id,
            'posicion_x': self.posicion_x,
            'posicion_y': self.posicion_y,
            'estado': self.estado,
            'parcela_id': self.parcela_id,
            'admin_bloqueo_id': self.admin_bloqueo_id
        }
    
    def __repr__(self):
        return f'<GridCuadrado ({self.posicion_x},{self.posicion_y})>'