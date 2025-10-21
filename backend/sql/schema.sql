CREATE DATABASE IF NOT EXISTS sistema_ferias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sistema_ferias;

-- Tablas INDEPENDIENTES (sin FK)
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

CREATE TABLE EstadoNotificacion (
    estado_notificacion_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    es_activo BOOLEAN DEFAULT TRUE
);

-- Tablas dependientes (1:N)
CREATE TABLE Rubro (
    rubro_id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    precio_parcela DECIMAL(10,2) NOT NULL,
    color_id INT NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (color_id) REFERENCES Color(color_id)
);

-- Usuario depende de Rol y EstadoUsuario (1:N)
CREATE TABLE Usuario (
    usuario_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    estado_id INT NOT NULL,
    rol_id INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estado_id) REFERENCES EstadoUsuario(estado_id),
    FOREIGN KEY (rol_id) REFERENCES Rol(rol_id)
);

-- TABLAS DE ADMINISTRADOR Y ORGANIZADOR (NUEVAS)
CREATE TABLE Administrador (
    administrador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

CREATE TABLE Organizador (
    organizador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id),
    FOREIGN KEY (creado_por) REFERENCES Usuario(usuario_id)
);

-- Artesano 
CREATE TABLE Artesano (
    artesano_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    dni VARCHAR(8) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
);

-- SISTEMA DE GRID 
CREATE TABLE Configuracion_Grid (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    ancho_total INT NOT NULL,  
    largo_total INT NOT NULL,  
    medida_cuadrado DECIMAL(8,2) NOT NULL -- Tamaño de cada cuadrado (3*3 metros)
);

-- Rubro → Parcela y LimiteRubro (1:N)
CREATE TABLE Parcela (
    parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    numero_parcela VARCHAR(20) UNIQUE NOT NULL,
    ancho DECIMAL(8,2) NOT NULL,
    largo DECIMAL(8,2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

-- CUADRADOS INDIVIDUALES DEL GRID (1:1 con Parcela)
CREATE TABLE Grid_Cuadrado (
    cuadrado_id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    posicion_x INT NOT NULL,  -- Coordenada X en el grid
    posicion_y INT NOT NULL,  -- Coordenada Y en el grid
    estado ENUM('disponible', 'bloqueado', 'reservado') DEFAULT 'disponible',
    parcela_id INT NOT NULL UNIQUE,  
    admin_bloqueo_id INT NULL,       
    FOREIGN KEY (config_id) REFERENCES Configuracion_Grid(config_id),
    FOREIGN KEY (parcela_id) REFERENCES Parcela(parcela_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_bloqueo_id) REFERENCES Usuario(usuario_id),
    UNIQUE KEY unique_posicion (config_id, posicion_x, posicion_y)
);

CREATE TABLE LimiteRubro (
    limite_id INT AUTO_INCREMENT PRIMARY KEY,
    rubro_id INT NOT NULL,
    max_puestos INT NOT NULL,
    fecha_vigencia DATE NOT NULL,
    es_activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (rubro_id) REFERENCES Rubro(rubro_id)
);

-- Solicitud 
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

-- TABLA PARA FOTOS VARIAS POR SOLICITUD
CREATE TABLE Solicitud_Foto (
    foto_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    url_foto VARCHAR(500) NOT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id) ON DELETE CASCADE
);

-- Solicitud_Parcela (N:M entre Solicitud y Parcela)
CREATE TABLE Solicitud_Parcela (
    solicitud_parcela_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_id INT NOT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_id) REFERENCES Parcela(parcela_id),
    UNIQUE KEY unique_solicitud_parcela (solicitud_id, parcela_id)
);

-- Pago (1:1 con Solicitud)
CREATE TABLE Pago (
    pago_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL UNIQUE,
    monto DECIMAL(10,2) NOT NULL,
    estado_pago_id INT NOT NULL,
    fecha_pago DATETIME,
    comprobante VARCHAR(500),
    parcelas_calculadas INT,
    dimension_base_calculo DECIMAL(8,2),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (estado_pago_id) REFERENCES EstadoPago(estado_pago_id)
);

-- Notificación (1:N con artesano)
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

-- Historial de participación (N:M entre artesano y Solicitud)
CREATE TABLE Historial_Participacion (
    historial_participacion_id INT AUTO_INCREMENT PRIMARY KEY,
    artesano_id INT NOT NULL,
    solicitud_id INT NOT NULL,
    FOREIGN KEY (artesano_id) REFERENCES Artesano(artesano_id),
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    UNIQUE KEY unique_historial (artesano_id, solicitud_id)
);

-- TABLA DE REASIGNACIÓN DE PUESTOS (MEJORADA)
CREATE TABLE ReasignacionPuesto (
    reasignacion_id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    parcela_anterior_id INT,
    parcela_nueva_id INT NOT NULL,
    administrador_id INT NOT NULL,
    motivo TEXT NOT NULL,
    fecha_reasignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notificado_artesano BOOLEAN DEFAULT FALSE,
    cuadrados_anteriores TEXT,      
    cuadrados_nuevos TEXT,          
    coordenadas_anteriores VARCHAR(100), 
    coordenadas_nuevas VARCHAR(100),    
    FOREIGN KEY (solicitud_id) REFERENCES Solicitud(solicitud_id),
    FOREIGN KEY (parcela_anterior_id) REFERENCES Parcela(parcela_id),
    FOREIGN KEY (parcela_nueva_id) REFERENCES Parcela(parcela_id),
    FOREIGN KEY (administrador_id) REFERENCES Administrador(administrador_id)
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
