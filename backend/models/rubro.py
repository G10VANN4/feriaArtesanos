from .base import db

class Rubro(db.Model):
    __tablename__ = 'Rubro'
    rubro_id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), unique=True, nullable=False)
    precio_parcela = db.Column(db.Numeric(10, 2), nullable=False)
    color_id = db.Column(db.Integer, db.ForeignKey('Color.color_id'), nullable=False)
    max_puestos = db.Column(db.Integer, default=50)
    puestos_asignados = db.Column(db.Integer, default=0)
    es_activo = db.Column(db.Boolean, default=True)
    
    # Relaciones
    solicitudes = db.relationship('Solicitud', backref='rubro', lazy=True)
    parcelas = db.relationship('Parcela', backref='rubro', lazy=True)
    
    def to_dict(self):
        return {
            'rubro_id': self.rubro_id,
            'tipo': self.tipo,
            'precio_parcela': float(self.precio_parcela) if self.precio_parcela else None,
            'color_id': self.color_id,
            'max_puestos': self.max_puestos,
            'puestos_asignados': self.puestos_asignados,
            'es_activo': self.es_activo
        }