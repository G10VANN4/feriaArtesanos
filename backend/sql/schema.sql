CREATE DATABASE IF NOT EXISTS sistema_ferias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_ferias;

-- Tablas de soporte
CREATE TABLE EstadoUsuario (
    estado_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Rol (
    rol_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Color (
    color_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigo_hex VARCHAR(7),
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Rubro (
    rubro_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    precio_parcela DECIMAL(10,2) NOT NULL,
    color_id INT NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (color_id) REFERENCES Color(color_id)
);

-- Usuario y relación de roles
CREATE TABLE Usuario (
    usuario_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    estado_id INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estado_id) REFERENCES EstadoUsuario(estado_id)
);

CREATE TABLE Usuario_Rol (
    usuario_id INT NOT NULL,
    rol_id INT NOT NULL,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rol_id),
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (rol_id) REFERENCES Rol(rol_id)
);

CREATE TABLE Artesano (
    artesano_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    rubro_id INT NOT NULL,
    descripcion TEXT,
    dimensiones_ancho DECIMAL(8,2),
    dimensiones_largo DECIMAL(8,2),
    foto_url VARCHAR(500),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(100) UNIQUE NOT NULL,
    DNI varchar(20),
    telefono VARCHAR(20),
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

CREATE TABLE Parcela (
    parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    ancho DECIMAL(8,2) NOT NULL,
    largo DECIMAL(8,2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    coordenadas_svg TEXT,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

CREATE TABLE EstadoSolicitud (
    estado_solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Solicitud (
    solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    estado_solicitud_id INT NOT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    comentarios_admin TEXT,
    dimensiones_solicitadas_ancho DECIMAL(8,2) NOT NULL,
    dimensiones_solicitadas_largo DECIMAL(8,2) NOT NULL,
    costo_calculado DECIMAL(10,2),
    parcelas_necesarias INT,
    terminos_aceptados BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_cancelacion DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (estado_solicitud_id) REFERENCES EstadoSolicitud(estado_solicitud_id)
);

CREATE TABLE Solicitud_Parcela (
    solicitud_parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_id INT NOT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_id) REFERENCES Parcela(parcela_id),
    UNIQUE KEY unique_solicitud_parcela (solicitud_id, parcela_id)
);

CREATE TABLE EstadoPago (
    estado_pago_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Pago (
    pago_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado_pago_id INT NOT NULL,
    fecha_pago DATETIME,
    comprobante VARCHAR(500),
    parcelas_calculadas INT,
    dimension_base_calculo DECIMAL(8,2),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (estado_pago_id) REFERENCES EstadoPago(estado_pago_id)
);

-- Inserts básicos
INSERT INTO EstadoUsuario (tipo) VALUES ('activo'),('suspendido'),('eliminado');
INSERT INTO Rol (tipo) VALUES ('artesano'),('administrador'),('organizador');
INSERT INTO Color (nombre, codigo_hex) VALUES ('rojo','#FF0000'),('azul','#0000FF'),('verde','#00FF00');
INSERT INTO Rubro (tipo, precio_parcela, color_id) VALUES ('Gastronomía',150.00,2),('Artesanía',100.00,3),('Reventa',120.00,1);
INSERT INTO EstadoSolicitud (nombre) VALUES ('pendiente'),('aprobada'),('rechazada'),('cancelada'),('pendiente por modificacion');
INSERT INTO EstadoPago (tipo) VALUES ('confirmado'),('pendiente'),('rechazado');
