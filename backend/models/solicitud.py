from .base import db
from sqlalchemy.orm import relationship
from datetime import datetime

class Solicitud(db.Model):
    __tablename__ = 'Solicitud'
    
    solicitud_id = db.Column(db.Integer, primary_key=True)
    artesano_id = db.Column(db.Integer, db.ForeignKey('Artesano.artesano_id'), nullable=False)
    estado_solicitud_id = db.Column(db.Integer, db.ForeignKey('EstadoSolicitud.estado_solicitud_id'), nullable=False)
    administrador_id = db.Column(db.Integer, db.ForeignKey('Administrador.administrador_id'))
    descripcion = db.Column(db.Text)
    dimensiones_ancho = db.Column(db.Numeric(8, 2), default=3.00)
    dimensiones_largo = db.Column(db.Numeric(8, 2), default=3.00)
    foto_url = db.Column(db.String(500))
    rubro_id = db.Column(db.Integer, db.ForeignKey('Rubro.rubro_id'), nullable=False)
    parcelas_necesarias = db.Column(db.Integer, nullable=False, default=1)
    costo_total = db.Column(db.Numeric(10, 2), nullable=False)
    fecha_solicitud = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_gestion = db.Column(db.DateTime)
    comentarios_admin = db.Column(db.Text)
    terminos_aceptados = db.Column(db.Boolean, nullable=False, default=False)
    fecha_cancelacion = db.Column(db.DateTime)
    
    artesano_rel = relationship("Artesano", backref="solicitudes_enviadas")
    rubro_rel = relationship("Rubro", backref="solicitudes_por_rubro")
    estado_rel = relationship("EstadoSolicitud", backref="solicitudes_en_estado")
    #administrador_rel = relationship("Administrador", backref="solicitudes_gestionadas")
    
    def to_dict(self):
        return {
            'solicitud_id': self.solicitud_id,
            'artesano_id': self.artesano_id,
            'estado_solicitud_id': self.estado_solicitud_id,
            'administrador_id': self.administrador_id,
            'descripcion': self.descripcion,
            'dimensiones_ancho': float(self.dimensiones_ancho) if self.dimensiones_ancho else None,
            'dimensiones_largo': float(self.dimensiones_largo) if self.dimensiones_largo else None,
            'foto_url': self.foto_url,
            'rubro_id': self.rubro_id,
            'parcelas_necesarias': self.parcelas_necesarias,
            'costo_total': float(self.costo_total) if self.costo_total else None,
            'fecha_solicitud': self.fecha_solicitud.isoformat() if self.fecha_solicitud else None,
            'fecha_gestion': self.fecha_gestion.isoformat() if self.fecha_gestion else None,
            'comentarios_admin': self.comentarios_admin,
            'terminos_aceptados': self.terminos_aceptados
        }
    
    def __repr__(self):
        return f'<Solicitud {self.solicitud_id}>'