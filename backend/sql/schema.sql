-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sistema_feria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sistema_feria;

-- Tablas básicas de configuración
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

CREATE TABLE EstadoSolicitud (
    estado_solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadoPago (
    estado_pago_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

-- Tabla de rubros con colores (RNF10)
CREATE TABLE Rubro (
    rubro_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    precio_parcela DECIMAL(10,2) NOT NULL,
    color_id INT NOT NULL,
    max_puestos INT NOT NULL DEFAULT 50,
    puestos_asignados INT DEFAULT 0,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (color_id) REFERENCES Color(color_id)
);

-- Usuarios del sistema
CREATE TABLE Usuario (
    usuario_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES Rol(rol_id)
);

-- Artesanos (RF2)
CREATE TABLE Artesano (
    artesano_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    dni VARCHAR(8) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
);

CREATE TABLE Organizador (
    organizador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

-- Administradores (relación 1:1 con Usuario)
CREATE TABLE Administrador (
    administrador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

-- Parcelas del predio (RF16)
CREATE TABLE Parcela (
    parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    sector VARCHAR(50) NOT NULL,
    numero_parcela VARCHAR(20) NOT NULL UNIQUE,
    ancho DECIMAL(8,2) NOT NULL,
    largo DECIMAL(8,2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

-- Solicitudes de participación (RF4, RF5, RF6)
CREATE TABLE Solicitud (
    solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    estado_solicitud_id INT NOT NULL,
    administrador_id INT,
    descripcion TEXT,
    dimensiones_ancho DECIMAL(8,2) DEFAULT 3.00,
    dimensiones_largo DECIMAL(8,2) DEFAULT 3.00,
    foto_url VARCHAR(500),
    rubro_id INT NOT NULL,
    parcelas_necesarias INT NOT NULL DEFAULT 1,
    costo_total DECIMAL(10,2) NOT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_gestion DATETIME,
    comentarios_admin TEXT,
    terminos_aceptados BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_cancelacion DATETIME,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (estado_solicitud_id) REFERENCES EstadoSolicitud(estado_solicitud_id),
    FOREIGN KEY (administrador_id) REFERENCES Administrador(administrador_id),
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

-- Asignación de parcelas a solicitudes (RF7, RF8)
CREATE TABLE Solicitud_Parcela (
    solicitud_parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_id INT NOT NULL,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_id) REFERENCES Parcela(parcela_id),
    UNIQUE KEY unique_parcela_activa (parcela_id)
);

-- Pagos (RF24, RF25)
CREATE TABLE Pago (
    pago_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    estado_pago_id INT NOT NULL,
    fecha_pago DATETIME,
    referencia_mercado_pago VARCHAR(100),
    comprobante_url VARCHAR(500),
    parcelas_calculadas INT,
    confirmado_automaticamente BOOLEAN DEFAULT FALSE,
    fecha_confirmacion DATETIME,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (estado_pago_id) REFERENCES EstadoPago(estado_pago_id)
);

-- Notificaciones (RF21)
CREATE TABLE Notificacion (
    notificacion_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    solicitud_id INT,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id)
);

-- Historial de participaciones (RF11)
CREATE TABLE Historial_Participacion (
    historial_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    solicitud_id INT NOT NULL UNIQUE,
    fecha_participacion DATE NOT NULL,
    parcelas_utilizadas INT,
    costo_pagado DECIMAL(10,2),
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id)
);

-- Reasignaciones de puestos (RF18)
CREATE TABLE ReasignacionPuesto (
    reasignacion_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_anterior_id INT,
    parcela_nueva_id INT NOT NULL,
    administrador_id INT NOT NULL,
    motivo TEXT NOT NULL,
    fecha_reasignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notificado_artesano BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_anterior_id) REFERENCES Parcela(parcela_id),
    FOREIGN KEY (parcela_nueva_id) REFERENCES Parcela(parcela_id),
    FOREIGN KEY (administrador_id) REFERENCES Administrador(administrador_id)
);

-- Insertar datos básicos
INSERT INTO Rol (tipo) VALUES 
('Artesano'),
('Administrador'),
('Organizador');

INSERT INTO Color (nombre, codigo_hex) VALUES 
('Rojo', '#FF0000'),
('Verde', '#00FF00'),
('Azul', '#0000FF');

INSERT INTO EstadoSolicitud (nombre) VALUES 
('Pendiente'),
('Aprobada'),
('Rechazada'),
('Cancelada'),
('Pendiente por modificación'),
('Esperando pago'),
('Confirmada');

INSERT INTO EstadoPago (tipo) VALUES 
('Pendiente'),
('Pagado'),
('Rechazado'),
('Reembolsado');

INSERT INTO Rubro (tipo, precio_parcela, color_id, max_puestos) VALUES 
('Gastronomía', 100000, 1, 30),
('Reventa', 25000, 2, 25),
('Artesanías', 15000, 3, 40);
