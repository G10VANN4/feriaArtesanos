from .base import db

class Parcela(db.Model):
    __tablename__ = 'Parcela'
    
    parcela_id = db.Column(db.Integer, primary_key=True)

    rubro_id = db.Column(db.Integer, db.ForeignKey('Rubro.rubro_id'), nullable=True)
    mapa_id = db.Column(db.Integer, db.ForeignKey('Mapa.mapa_id'), nullable=False)
    tipo_parcela_id = db.Column(db.Integer, db.ForeignKey('Tipo_parcela.tipo_parcela_id'), nullable=True)


    fila = db.Column(db.Integer, nullable=False)
    columna = db.Column(db.Integer, nullable=False)
    habilitada = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'parcela_id': self.parcela_id,
            'rubro_id': self.rubro_id,
            'mapa_id': self.mapa_id,
            'tipo_parcela_id': self.tipo_parcela_id,
            'fila': self.fila,
            'columna': self.columna,
            'habilitada': self.habilitada
        }


    def cambiar_estado_parcela(self, estado: bool):
        self.habilitada = estado

    def verificar_disponibilidad(self):
        return self.habilitada
