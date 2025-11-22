from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum

class RolEnum(str, enum.Enum):
    AGENTE = "agente"
    ADMINISTRADOR = "administrador"

class EstadoCasoEnum(str, enum.Enum):
    ABIERTO = "ABIERTO"
    EN_PROCESO = "EN_PROCESO"
    CERRADO = "CERRADO"

class PrioridadEnum(str, enum.Enum):
    ALTA = "ALTA"
    MEDIA = "MEDIA"
    BAJA = "BAJA"

class TipoAlertaEnum(str, enum.Enum):
    SLA_5_DIAS = "SLA_5_DIAS"
    PRIORIDAD_ALTA = "PRIORIDAD_ALTA"

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre_completo = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True)
    rol = Column(Enum(RolEnum), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ultimo_acceso = Column(DateTime, nullable=True)
    
    casos_creados = relationship("Caso", back_populates="agente_creador", foreign_keys="Caso.agente_creador_id")
    casos_asignados = relationship("Caso", back_populates="agente_asignado", foreign_keys="Caso.agente_asignado_id")

class Departamento(Base):
    __tablename__ = "departamentos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    codigo = Column(String(10), nullable=True)
    
    ciudades = relationship("Ciudad", back_populates="departamento")

class Ciudad(Base):
    __tablename__ = "ciudades"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    departamento_id = Column(Integer, ForeignKey("departamentos.id"))
    
    departamento = relationship("Departamento", back_populates="ciudades")

class Paciente(Base):
    __tablename__ = "pacientes"
    
    id = Column(Integer, primary_key=True, index=True)
    identificacion = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    apellidos = Column(String(200), nullable=False)
    celular = Column(String(50), nullable=False)
    direccion = Column(Text, nullable=False)
    departamento = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False)
    fecha_registro = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    actualizado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    casos = relationship("Caso", back_populates="paciente")

class MotivoPQR(Base):
    __tablename__ = "motivos_pqr"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=0)
    
    casos = relationship("Caso", back_populates="motivo_obj")

class Caso(Base):
    __tablename__ = "casos"
    
    id = Column(Integer, primary_key=True, index=True)
    numero_caso = Column(String(50), unique=True, index=True, nullable=False)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    motivo_id = Column(Integer, ForeignKey("motivos_pqr.id"), nullable=False)
    prioridad = Column(Enum(PrioridadEnum), default=PrioridadEnum.MEDIA)
    estado = Column(Enum(EstadoCasoEnum), default=EstadoCasoEnum.ABIERTO)
    descripcion = Column(Text, nullable=False)
    agente_creador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    agente_asignado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    fecha_actualizacion = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    fecha_cierre = Column(DateTime, nullable=True)
    tiempo_resolucion_horas = Column(Float, nullable=True)
    
    paciente = relationship("Paciente", back_populates="casos")
    motivo_obj = relationship("MotivoPQR", back_populates="casos")
    agente_creador = relationship("Usuario", back_populates="casos_creados", foreign_keys=[agente_creador_id])
    agente_asignado = relationship("Usuario", back_populates="casos_asignados", foreign_keys=[agente_asignado_id])
    interacciones = relationship("Interaccion", back_populates="caso")
    historial_estados = relationship("HistorialEstado", back_populates="caso")
    alertas = relationship("Alerta", back_populates="caso")

class Interaccion(Base):
    __tablename__ = "interacciones"
    
    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False)
    omnileads_call_id = Column(String(100), nullable=True)
    omnileads_campaign_id = Column(String(100), nullable=True)
    omnileads_campaign_name = Column(String(200), nullable=True)
    omnileads_campaign_type = Column(String(50), nullable=True)
    agent_id = Column(String(100), nullable=True)
    agent_username = Column(String(100), nullable=True)
    agent_name = Column(String(200), nullable=True)
    telefono_contacto = Column(String(50), nullable=True)
    datetime_llamada = Column(DateTime, nullable=True)
    rec_filename = Column(String(200), nullable=True)
    observaciones = Column(Text, nullable=True)
    fecha_registro = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    caso = relationship("Caso", back_populates="interacciones")

class HistorialEstado(Base):
    __tablename__ = "historial_estados"
    
    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False)
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    comentario = Column(Text, nullable=True)
    fecha_cambio = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    caso = relationship("Caso", back_populates="historial_estados")

class Alerta(Base):
    __tablename__ = "alertas"
    
    id = Column(Integer, primary_key=True, index=True)
    caso_id = Column(Integer, ForeignKey("casos.id"), nullable=False)
    tipo_alerta = Column(Enum(TipoAlertaEnum), nullable=False)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    leida = Column(Boolean, default=False)
    usuario_notificado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    caso = relationship("Caso", back_populates="alertas")
