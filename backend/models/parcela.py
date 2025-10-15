from .base import db

class Parcela(db.Model):
    __tablename__ = 'Parcela'
    parcela_id = db.Column(db.Integer, primary_key=True)
    rubro_id = db.Column(db.Integer, db.ForeignKey('Rubro.rubro_id'), nullable=False)
    sector = db.Column(db.String(50), nullable=False)
    numero_parcela = db.Column(db.String(20), unique=True, nullable=False)
    ancho = db.Column(db.Numeric(8, 2), nullable=False)
    largo = db.Column(db.Numeric(8, 2), nullable=False)
    disponible = db.Column(db.Boolean, default=True)
    
    # Relaciones
    solicitudes_parcelas = db.relationship('SolicitudParcela', backref='parcela', lazy=True)
    reasignaciones_anteriores = db.relationship('ReasignacionPuesto', foreign_keys='ReasignacionPuesto.parcela_anterior_id', backref='parcela_anterior', lazy=True)
    reasignaciones_nuevas = db.relationship('ReasignacionPuesto', foreign_keys='ReasignacionPuesto.parcela_nueva_id', backref='parcela_nueva', lazy=True)
    
    def to_dict(self):
        return {
            'parcela_id': self.parcela_id,
            'rubro_id': self.rubro_id,
            'sector': self.sector,
            'numero_parcela': self.numero_parcela,
            'ancho': float(self.ancho) if self.ancho else None,
            'largo': float(self.largo) if self.largo else None,
            'disponible': self.disponible
        }