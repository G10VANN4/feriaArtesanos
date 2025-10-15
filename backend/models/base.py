from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

#clase base para modelos
class BaseModel(db.Model):
    __abstract__ = True
    
    def save(self):
        db.session.add(self)
        db.session.commit()
    
    def delete(self):
        db.session.delete(self)
        db.session.commit()