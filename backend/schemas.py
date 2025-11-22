from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from models import RolEnum, EstadoCasoEnum, PrioridadEnum, TipoAlertaEnum

class UsuarioBase(BaseModel):
    username: str
    nombre_completo: str
    email: str
    rol: RolEnum

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None

class Usuario(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool
    fecha_creacion: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Usuario

class LoginRequest(BaseModel):
    username: str
    password: str

class PacienteBase(BaseModel):
    identificacion: str
    nombre: str
    apellidos: str
    celular: str
    direccion: str
    departamento: str
    ciudad: str

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    celular: Optional[str] = None
    direccion: Optional[str] = None
    departamento: Optional[str] = None
    ciudad: Optional[str] = None

class Paciente(PacienteBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha_registro: datetime

class MotivoPQRBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    orden: int = 0

class MotivoPQRCreate(MotivoPQRBase):
    pass

class MotivoPQR(MotivoPQRBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activo: bool

class CasoBase(BaseModel):
    paciente_id: int
    motivo_id: int
    prioridad: PrioridadEnum
    estado: EstadoCasoEnum
    descripcion: str
    agente_asignado_id: Optional[int] = None

class CasoCreate(BaseModel):
    paciente_id: int
    motivo_id: int
    prioridad: PrioridadEnum = PrioridadEnum.MEDIA
    estado: EstadoCasoEnum = EstadoCasoEnum.ABIERTO
    descripcion: str
    agente_asignado_id: Optional[int] = None

class CasoUpdate(BaseModel):
    estado: Optional[EstadoCasoEnum] = None
    prioridad: Optional[PrioridadEnum] = None
    agente_asignado_id: Optional[int] = None
    descripcion: Optional[str] = None

class InteraccionCreate(BaseModel):
    caso_id: int
    omnileads_call_id: Optional[str] = None
    omnileads_campaign_id: Optional[str] = None
    omnileads_campaign_name: Optional[str] = None
    omnileads_campaign_type: Optional[str] = None
    agent_id: Optional[str] = None
    agent_username: Optional[str] = None
    agent_name: Optional[str] = None
    telefono_contacto: Optional[str] = None
    datetime_llamada: Optional[datetime] = None
    rec_filename: Optional[str] = None
    observaciones: Optional[str] = None

class Interaccion(InteraccionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha_registro: datetime

class HistorialEstado(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    caso_id: int
    estado_anterior: Optional[str]
    estado_nuevo: str
    usuario_id: Optional[int]
    comentario: Optional[str]
    fecha_cambio: datetime

class Caso(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero_caso: str
    paciente_id: int
    motivo_id: int
    prioridad: PrioridadEnum
    estado: EstadoCasoEnum
    descripcion: str
    agente_creador_id: int
    agente_asignado_id: Optional[int]
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    fecha_cierre: Optional[datetime]
    tiempo_resolucion_horas: Optional[float]
    paciente: Optional[Paciente] = None

class CasoDetalle(Caso):
    paciente: Paciente
    motivo_obj: MotivoPQR
    agente_creador: Usuario
    agente_asignado: Optional[Usuario]
    interacciones: List[Interaccion]
    historial_estados: List[HistorialEstado]

class Alerta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    caso_id: int
    tipo_alerta: TipoAlertaEnum
    fecha_creacion: datetime
    leida: bool
    usuario_notificado_id: Optional[int]

class DashboardMetrics(BaseModel):
    casos_abiertos_hoy: int
    casos_cerrados_hoy: int
    casos_en_proceso: int
    tasa_resolucion_primera_llamada: float
    tiempo_promedio_resolucion: float
    total_casos: int
    alertas_activas: int

class Departamento(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    codigo: Optional[str]

class Ciudad(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    departamento_id: int
