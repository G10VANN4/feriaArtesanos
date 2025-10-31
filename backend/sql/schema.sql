CREATE DATABASE IF NOT EXISTS sistema_ferias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sistema_ferias;

CREATE TABLE Color (
    color_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    codigo_hex VARCHAR(7),
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadoUsuario (
    estado_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadoPago (
    estado_pago_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadoSolicitud (
    estado_solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadoNotificacion (
    estado_notificacion_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Rol (
    rol_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Mapa (
    mapa_id INT AUTO_INCREMENT PRIMARY KEY,
    cant_total_filas INT NOT NULL,
    cant_total_columnas INT NOT NULL
);

CREATE TABLE Tipo_parcela (
    tipo_parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Rubro (
    rubro_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) UNIQUE NOT NULL,
    precio_parcela DECIMAL(10,2) NOT NULL,
    color_id INT NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (color_id) REFERENCES Color(color_id)
);

CREATE TABLE Usuario (
    usuario_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    estado_id INT NOT NULL,
    rol_id INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estado_id) REFERENCES EstadoUsuario(estado_id),
    FOREIGN KEY (rol_id) REFERENCES Rol(rol_id)
);

CREATE TABLE Artesano (
    artesano_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    dni VARCHAR(8) UNIQUE NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
);

CREATE TABLE Administrador (
    administrador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

CREATE TABLE Organizador (
    organizador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

CREATE TABLE Parcela (
    parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    mapa_id INT NOT NULL,
    tipo_parcela_id INT NOT NULL,
    fila INT NOT NULL,
    columna INT NOT NULL,
    habilitada BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id),
    FOREIGN KEY (mapa_id) REFERENCES Mapa(mapa_id),
    FOREIGN KEY (tipo_parcela_id) REFERENCES Tipo_parcela(tipo_parcela_id)
);

CREATE TABLE Solicitud (
    solicitud_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    estado_solicitud_id INT NOT NULL,
    administrador_id INT,
    descripcion TEXT,
    dimensiones_ancho DECIMAL(8,2) DEFAULT 3.00,
    dimensiones_largo DECIMAL(8,2) DEFAULT 3.00,
    rubro_id INT NOT NULL,
    parcelas_necesarias INT DEFAULT 1 NOT NULL,
    costo_total DECIMAL(10,2) NOT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_gestion DATETIME,
    comentarios_admin TEXT,
    terminos_aceptados BOOLEAN DEFAULT FALSE NOT NULL,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (estado_solicitud_id) REFERENCES EstadoSolicitud(estado_solicitud_id),
    FOREIGN KEY (administrador_id) REFERENCES Administrador(administrador_id),
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

CREATE TABLE Solicitud_Foto (
    foto_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    base64 LONGTEXT,
    extension VARCHAR(10) NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id) ON DELETE CASCADE
);

CREATE TABLE Solicitud_Parcela (
    solicitud_parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_id INT NOT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_id) REFERENCES Parcela(parcela_id)
);

CREATE TABLE Pago (
    pago_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT UNIQUE NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado_pago_id INT NOT NULL,
    fecha_pago DATETIME,
    comprobante VARCHAR(500),
    parcelas_calculadas INT,
    dimension_base_calculo DECIMAL(8,2),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (estado_pago_id) REFERENCES EstadoPago(estado_pago_id)
);

CREATE TABLE Notificacion (
    notificacion_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_notificacion_id INT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (estado_notificacion_id) REFERENCES EstadoNotificacion(estado_notificacion_id)
);

CREATE TABLE LimiteRubro (
    limite_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    max_puestos INT NOT NULL,
    fecha_vigencia DATE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

CREATE TABLE Historial_Participacion (
    historial_participacion_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    solicitud_id INT NOT NULL,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id)
);



-- Insertar datos básicos
INSERT INTO EstadoUsuario (tipo) VALUES 
('Activo'),
('Inactivo'),
('Suspendido');

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

INSERT INTO EstadoNotificacion (nombre) VALUES 
('Enviada'),
('Leída'),
('Fallida');

INSERT INTO Rubro (tipo, precio_parcela, color_id) VALUES 
('Gastronomía', 100000, 1),
('Reventa', 25000, 2),
('Artesanías', 15000, 3);

INSERT INTO Configuracion_Grid (ancho_total, largo_total, medida_cuadrado) 
VALUES (10, 10, 3.00);
