from .base import db
from datetime import datetime

class ReasignacionPuesto(db.Model):
    __tablename__ = 'ReasignacionPuesto'
    reasignacion_id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey('Solicitud.solicitud_id'), nullable=False)
    parcela_anterior_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'))
    parcela_nueva_id = db.Column(db.Integer, db.ForeignKey('Parcela.parcela_id'), nullable=False)
    administrador_id = db.Column(db.Integer, db.ForeignKey('Administrador.administrador_id'), nullable=False)
    motivo = db.Column(db.Text, nullable=False)
    fecha_reasignacion = db.Column(db.DateTime, default=datetime.utcnow)
    notificado_artesano = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'reasignacion_id': self.reasignacion_id,
            'solicitud_id': self.solicitud_id,
            'parcela_anterior_id': self.parcela_anterior_id,
            'parcela_nueva_id': self.parcela_nueva_id,
            'administrador_id': self.administrador_id,
            'motivo': self.motivo,
            'fecha_reasignacion': self.fecha_reasignacion.isoformat() if self.fecha_reasignacion else None,
            'notificado_artesano': self.notificado_artesano
        }