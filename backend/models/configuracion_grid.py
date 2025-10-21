from .base import db

class ConfiguracionGrid(db.Model):
    __tablename__ = 'Configuracion_Grid'
    config_id = db.Column(db.Integer, primary_key=True)
    ancho_total = db.Column(db.Integer, nullable=False)
    largo_total = db.Column(db.Integer, nullable=False)
    medida_cuadrado = db.Column(db.Numeric(8, 2), nullable=False)
    
    # Relaciones
    cuadrados = db.relationship('GridCuadrado', backref='configuracion', lazy=True)
    
    def to_dict(self):
        return {
            'config_id': self.config_id,
            'ancho_total': self.ancho_total,
            'largo_total': self.largo_total,
            'medida_cuadrado': float(self.medida_cuadrado) if self.medida_cuadrado else None
        }