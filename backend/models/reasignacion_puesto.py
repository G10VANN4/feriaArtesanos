
from .base import db

class ReasignacionPuesto(db.Model):
    __tablename__ = 'ReasignacionPuesto'
    
    reasignacion_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False)
    parcela_anterior_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'))
    parcela_nueva_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'), nullable=False)
    administrador_id = db.Column(db.Integer, db.ForeignKey('Administrador.administrador_id'), nullable=False)
    motivo = db.Column(db.Text, nullable=False)
    fecha_reasignacion = db.Column(db.DateTime, default=db.func.current_timestamp())
    notificado_artesano = db.Column(db.Boolean, default=False)
    cuadrados_anteriores = db.Column(db.Text)
    cuadrados_nuevos = db.Column(db.Text)
    coordenadas_anteriores = db.Column(db.String(100))
    coordenadas_nuevas = db.Column(db.String(100))

    
    def to_dict(self):
        return {
            'reasignacion_id': self.reasignacion_id,
            'solicitud_id': self.solicitud_id,
            'parcela_anterior_id': self.parcela_anterior_id,
            'parcela_nueva_id': self.parcela_nueva_id,
            'administrador_id': self.administrador_id,
            'motivo': self.motivo,
            'fecha_reasignacion': self.fecha_reasignacion.isoformat() if self.fecha_reasignacion else None,
            'notificado_artesano': self.notificado_artesano,
            'cuadrados_anteriores': self.cuadrados_anteriores,
            'cuadrados_nuevos': self.cuadrados_nuevos,
            'coordenadas_anteriores': self.coordenadas_anteriores,
            'coordenadas_nuevas': self.coordenadas_nuevas
        }
    
    def __repr__(self):
        return f'<ReasignacionPuesto {self.reasignacion_id}>'