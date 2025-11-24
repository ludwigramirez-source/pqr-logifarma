from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, extract, case
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

from database import get_db, engine, Base
from models import (
    Usuario, Paciente, Caso, MotivoPQR, Interaccion, HistorialEstado, HistorialEvento,
    Alerta, Departamento, Ciudad, EstadoCasoEnum, PrioridadEnum, TipoAlertaEnum, RolEnum
)
import schemas
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_admin_user
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear la app principal
app = FastAPI(title="LOGIFARMA PQR API")

# Router con prefijo /api
api_router = APIRouter(prefix="/api")

# ==================== AUTENTICACIÓN ====================

@api_router.post("/auth/login", response_model=schemas.Token)
async def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/logout")
async def logout(current_user: Usuario = Depends(get_current_user)):
    return {"message": "Sesión cerrada exitosamente"}

@api_router.get("/auth/me", response_model=schemas.Usuario)
async def get_current_user_info(current_user: Usuario = Depends(get_current_user)):
    return current_user

# ==================== VISTA EMBEBIDA (SIN AUTENTICACIÓN) ====================

def generar_numero_caso(db: Session) -> str:
    """Genera un número de caso único con formato RAD-XXXX (autoincremental)"""
    prefix = "RAD-"

    # Buscar el último caso creado (sin importar la fecha)
    ultimo_caso = db.query(Caso).filter(
        Caso.numero_caso.like(f"{prefix}%")
    ).order_by(Caso.id.desc()).first()

    if ultimo_caso:
        # Extraer el número del último caso (RAD-1234 -> 1234)
        ultimo_num = int(ultimo_caso.numero_caso.split('-')[-1])
        nuevo_num = ultimo_num + 1
    else:
        nuevo_num = 1

    return f"{prefix}{nuevo_num}"

def registrar_evento(
    db: Session,
    caso_id: int,
    usuario_id: Optional[int],
    tipo_evento: str,
    campo_modificado: Optional[str] = None,
    valor_anterior: Optional[str] = None,
    valor_nuevo: Optional[str] = None,
    comentario: Optional[str] = None,
    datos_adicionales: Optional[str] = None
):
    """
    Registra un evento en el historial unificado del caso

    Tipos de evento:
    - creacion: Caso creado
    - cambio_estado: Cambio de estado
    - cambio_prioridad: Cambio de prioridad
    - asignacion: Asignación/reasignación de agente
    - interaccion: Nueva interacción/llamada
    - edicion_descripcion: Cambio en descripción
    - edicion_paciente: Cambio en datos del paciente
    """
    evento = HistorialEvento(
        caso_id=caso_id,
        usuario_id=usuario_id,
        tipo_evento=tipo_evento,
        campo_modificado=campo_modificado,
        valor_anterior=valor_anterior,
        valor_nuevo=valor_nuevo,
        comentario=comentario,
        datos_adicionales=datos_adicionales
    )
    db.add(evento)
    return evento

@api_router.get("/embedded/paciente/{identificacion}")
async def buscar_paciente_embebido(
    identificacion: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint para buscar paciente sin autenticación (vista embebida)
    """
    paciente = db.query(Paciente).filter(Paciente.identificacion == identificacion).first()
    if not paciente:
        return {"found": False, "paciente": None, "casos": []}

    # Buscar casos pendientes (ABIERTO o EN_PROCESO)
    casos = db.query(Caso).filter(
        Caso.paciente_id == paciente.id,
        Caso.estado.in_([EstadoCasoEnum.ABIERTO, EstadoCasoEnum.EN_PROCESO])
    ).all()

    return {
        "found": True,
        "paciente": {
            "id": paciente.id,
            "identificacion": paciente.identificacion,
            "nombre": paciente.nombre,
            "apellidos": paciente.apellidos,
            "celular": paciente.celular,
            "email": paciente.email,
            "direccion": paciente.direccion,
            "departamento": paciente.departamento,
            "ciudad": paciente.ciudad
        },
        "casos": [
            {
                "id": caso.id,
                "numero_caso": caso.numero_caso,
                "estado": caso.estado.value,
                "prioridad": caso.prioridad.value,
                "motivo_id": caso.motivo_id,
                "motivo_nombre": caso.motivo_obj.nombre if caso.motivo_obj else "Sin motivo",
                "descripcion": caso.descripcion,
                "fecha_creacion": caso.fecha_creacion.isoformat()
            }
            for caso in casos
        ]
    }

@api_router.get("/embedded/paciente/{identificacion}/historial")
async def obtener_historial_paciente_embebido(
    identificacion: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint para obtener historial completo de casos sin autenticación (vista embebida)
    """
    paciente = db.query(Paciente).filter(Paciente.identificacion == identificacion).first()
    if not paciente:
        return []

    # Buscar todos los casos del paciente
    casos = db.query(Caso).filter(
        Caso.paciente_id == paciente.id
    ).order_by(Caso.fecha_creacion.desc()).all()

    return [
        {
            "id": caso.id,
            "numero_caso": caso.numero_caso,
            "estado": caso.estado.value,
            "prioridad": caso.prioridad.value,
            "motivo_id": caso.motivo_id,
            "motivo_nombre": caso.motivo_obj.nombre if caso.motivo_obj else "Sin motivo",
            "descripcion": caso.descripcion,
            "fecha_creacion": caso.fecha_creacion.isoformat()
        }
        for caso in casos
    ]

@api_router.post("/embedded/caso", response_model=schemas.Caso)
async def crear_caso_embebido(
    caso_data: dict,
    db: Session = Depends(get_db)
):
    """
    Endpoint para vista embebida de OmniLeads (sin autenticación)
    Recibe datos del paciente, caso e información de OmniLeads
    """
    try:
        # Extraer datos del paciente
        paciente_data = caso_data.get('paciente', {})
        identificacion = paciente_data.get('identificacion')
        
        # Buscar o crear paciente
        paciente = db.query(Paciente).filter(Paciente.identificacion == identificacion).first()
        if not paciente:
            paciente = Paciente(
                identificacion=identificacion,
                nombre=paciente_data.get('nombre'),
                apellidos=paciente_data.get('apellidos'),
                celular=paciente_data.get('celular'),
                email=paciente_data.get('email'),
                direccion=paciente_data.get('direccion'),
                departamento=paciente_data.get('departamento'),
                ciudad=paciente_data.get('ciudad')
            )
            db.add(paciente)
            db.flush()
        
        # Buscar agente por defecto (el primero disponible) para uso posterior
        agente = db.query(Usuario).filter(Usuario.rol == "agente", Usuario.activo == True).first()
        if not agente:
            agente = db.query(Usuario).filter(Usuario.activo == True).first()

        # Si es un caso existente, actualizarlo
        numero_caso_buscar = caso_data.get('numero_caso_existente')
        if numero_caso_buscar:
            caso = db.query(Caso).filter(Caso.numero_caso == numero_caso_buscar).first()
            if caso:
                caso.estado = EstadoCasoEnum[caso_data.get('estado', 'ABIERTO')]
                caso.descripcion = caso_data.get('descripcion', caso.descripcion)
                caso.prioridad = PrioridadEnum[caso_data.get('prioridad', 'MEDIA')]
            else:
                raise HTTPException(status_code=404, detail="Caso no encontrado")
        else:
            # Crear nuevo caso
            
            numero_caso = generar_numero_caso(db)
            
            caso = Caso(
                numero_caso=numero_caso,
                paciente_id=paciente.id,
                motivo_id=caso_data.get('motivo_id'),
                prioridad=PrioridadEnum[caso_data.get('prioridad', 'MEDIA')],
                estado=EstadoCasoEnum[caso_data.get('estado', 'ABIERTO')],
                descripcion=caso_data.get('descripcion'),
                agente_creador_id=agente.id if agente else 1,
                agente_asignado_id=agente.id if agente else None,
                origen='call'  # Los casos desde embedded view son de call center
            )
            db.add(caso)
            db.flush()

            # Registrar evento de creación
            registrar_evento(
                db=db,
                caso_id=caso.id,
                usuario_id=agente.id if agente else None,
                tipo_evento='creacion',
                campo_modificado=None,
                valor_anterior=None,
                valor_nuevo=f"Caso {caso.numero_caso} creado",
                comentario="Caso creado desde call center (OmniLeads)"
            )

            # Registrar en historial (compatibilidad)
            historial = HistorialEstado(
                caso_id=caso.id,
                estado_anterior=None,
                estado_nuevo=caso.estado.value,
                usuario_id=agente.id if agente else None,
                comentario="Caso creado desde vista embebida"
            )
            db.add(historial)
        
        # Registrar interacción de OmniLeads
        omnileads_data = caso_data.get('omnileads', {})
        interaccion = Interaccion(
            caso_id=caso.id,
            omnileads_call_id=omnileads_data.get('call_id'),
            omnileads_campaign_id=omnileads_data.get('campaign_id'),
            omnileads_campaign_name=omnileads_data.get('campaign_name'),
            omnileads_campaign_type=omnileads_data.get('campaign_type'),
            agent_id=omnileads_data.get('agent_id'),
            agent_username=omnileads_data.get('agent_username'),
            agent_name=omnileads_data.get('agent_name'),
            telefono_contacto=omnileads_data.get('telefono'),
            datetime_llamada=omnileads_data.get('datetime'),
            rec_filename=omnileads_data.get('rec_filename'),
            observaciones=caso_data.get('descripcion')
        )
        db.add(interaccion)
        db.flush()

        # Registrar evento de interacción
        import json
        datos_omnileads = json.dumps({
            "agent_name": omnileads_data.get('agent_name'),
            "campaign_name": omnileads_data.get('campaign_name'),
            "telefono": omnileads_data.get('telefono')
        })
        registrar_evento(
            db=db,
            caso_id=caso.id,
            usuario_id=agente.id if agente else None,
            tipo_evento='interaccion',
            campo_modificado='llamada',
            valor_anterior=None,
            valor_nuevo=f"Llamada {omnileads_data.get('agent_name', 'Agente')}",
            comentario=caso_data.get('descripcion'),
            datos_adicionales=datos_omnileads
        )

        # Crear alerta si es prioridad alta
        if caso.prioridad == PrioridadEnum.ALTA:
            alerta = Alerta(
                caso_id=caso.id,
                tipo_alerta=TipoAlertaEnum.PRIORIDAD_ALTA,
                leida=False
            )
            db.add(alerta)
        
        db.commit()
        db.refresh(caso)
        
        return caso
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear caso embebido: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PACIENTES ====================

@api_router.get("/pacientes", response_model=List[schemas.Paciente])
async def listar_pacientes(
    identificacion: Optional[str] = None,
    nombre: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Paciente)
    
    if identificacion:
        query = query.filter(Paciente.identificacion == identificacion)
    if nombre:
        query = query.filter(
            or_(
                Paciente.nombre.ilike(f"%{nombre}%"),
                Paciente.apellidos.ilike(f"%{nombre}%")
            )
        )
    
    pacientes = query.offset(skip).limit(limit).all()
    return pacientes

@api_router.get("/pacientes/{paciente_id}", response_model=schemas.Paciente)
async def obtener_paciente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    paciente = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente

@api_router.post("/pacientes", response_model=schemas.Paciente)
async def crear_paciente(
    paciente: schemas.PacienteCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verificar si ya existe
    existe = db.query(Paciente).filter(Paciente.identificacion == paciente.identificacion).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un paciente con esta identificación")
    
    db_paciente = Paciente(**paciente.model_dump(), actualizado_por=current_user.id)
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente

@api_router.get("/pacientes/{paciente_id}/casos", response_model=List[schemas.Caso])
async def obtener_casos_paciente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    casos = db.query(Caso).filter(Caso.paciente_id == paciente_id).order_by(Caso.fecha_creacion.desc()).all()
    return casos

# ==================== CASOS ====================

@api_router.get("/casos", response_model=List[schemas.Caso])
async def listar_casos(
    numero_caso: Optional[str] = None,
    estado: Optional[EstadoCasoEnum] = None,
    prioridad: Optional[PrioridadEnum] = None,
    motivo_id: Optional[int] = None,
    paciente_identificacion: Optional[str] = None,
    agente_id: Optional[int] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    origen: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Caso).options(joinedload(Caso.paciente), joinedload(Caso.motivo_obj))

    # PERMISOS POR ROL: Agentes solo ven casos asignados a ellos
    if current_user.rol == RolEnum.AGENTE:
        query = query.filter(Caso.agente_asignado_id == current_user.id)
    # Administradores ven todos los casos

    if numero_caso:
        query = query.filter(Caso.numero_caso.ilike(f"%{numero_caso}%"))
    if estado:
        query = query.filter(Caso.estado == estado)
    if prioridad:
        query = query.filter(Caso.prioridad == prioridad)
    if motivo_id:
        query = query.filter(Caso.motivo_id == motivo_id)
    if agente_id:
        query = query.filter(or_(Caso.agente_creador_id == agente_id, Caso.agente_asignado_id == agente_id))
    if paciente_identificacion:
        query = query.join(Paciente).filter(Paciente.identificacion == paciente_identificacion)
    if fecha_desde:
        query = query.filter(Caso.fecha_creacion >= datetime.fromisoformat(fecha_desde))
    if fecha_hasta:
        query = query.filter(Caso.fecha_creacion <= datetime.fromisoformat(fecha_hasta))
    if origen:
        query = query.filter(Caso.origen == origen)

    casos = query.order_by(Caso.fecha_creacion.desc()).offset(skip).limit(limit).all()
    return casos

@api_router.get("/casos/{caso_id}", response_model=schemas.CasoDetalle)
async def obtener_caso(
    caso_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    caso = db.query(Caso).options(
        joinedload(Caso.paciente),
        joinedload(Caso.motivo_obj),
        joinedload(Caso.agente_creador),
        joinedload(Caso.agente_asignado),
        joinedload(Caso.interacciones),
        joinedload(Caso.historial_estados),
        joinedload(Caso.historial_eventos_new).joinedload(HistorialEvento.usuario)
    ).filter(Caso.id == caso_id).first()
    
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    # PERMISOS: Agentes solo pueden ver casos asignados a ellos
    if current_user.rol == RolEnum.AGENTE and caso.agente_asignado_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver este caso")

    return caso

@api_router.post("/casos", response_model=schemas.Caso)
async def crear_caso(
    caso: schemas.CasoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    numero_caso = generar_numero_caso(db)
    
    db_caso = Caso(
        **caso.model_dump(),
        numero_caso=numero_caso,
        agente_creador_id=current_user.id
    )
    db.add(db_caso)
    db.flush()

    # Registrar evento de creación
    registrar_evento(
        db=db,
        caso_id=db_caso.id,
        usuario_id=current_user.id,
        tipo_evento='creacion',
        campo_modificado=None,
        valor_anterior=None,
        valor_nuevo=f"Caso {db_caso.numero_caso} creado",
        comentario="Caso creado desde web"
    )

    # Registrar en historial (compatibilidad)
    historial = HistorialEstado(
        caso_id=db_caso.id,
        estado_anterior=None,
        estado_nuevo=db_caso.estado.value,
        usuario_id=current_user.id,
        comentario="Caso creado"
    )
    db.add(historial)
    
    # Crear alerta si es prioridad alta
    if db_caso.prioridad == PrioridadEnum.ALTA:
        alerta = Alerta(
            caso_id=db_caso.id,
            tipo_alerta=TipoAlertaEnum.PRIORIDAD_ALTA,
            leida=False
        )
        db.add(alerta)
    
    db.commit()
    db.refresh(db_caso)
    return db_caso

@api_router.put("/casos/{caso_id}", response_model=schemas.Caso)
async def actualizar_caso(
    caso_id: int,
    caso_update: dict,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    caso = db.query(Caso).filter(Caso.id == caso_id).first()
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    # PERMISOS: Solo administradores o el agente asignado pueden actualizar
    if current_user.rol == RolEnum.AGENTE and caso.agente_asignado_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar este caso")

    # Guardar valores anteriores
    estado_anterior = caso.estado.value if caso.estado else None
    prioridad_anterior = caso.prioridad.value if caso.prioridad else None
    agente_anterior_id = caso.agente_asignado_id
    descripcion_anterior = caso.descripcion

    comentario = caso_update.pop('comentario', None)

    # Actualizar campos y registrar eventos
    for key, value in caso_update.items():
        if key in ['estado', 'prioridad', 'agente_asignado_id', 'descripcion']:
            if key == 'estado':
                nuevo_valor = EstadoCasoEnum[value] if isinstance(value, str) else value
                if caso.estado != nuevo_valor:
                    # Registrar evento de cambio de estado
                    registrar_evento(
                        db=db,
                        caso_id=caso.id,
                        usuario_id=current_user.id,
                        tipo_evento='cambio_estado',
                        campo_modificado='estado',
                        valor_anterior=estado_anterior,
                        valor_nuevo=nuevo_valor.value,
                        comentario=comentario
                    )
                    # Mantener compatibilidad con tabla antigua
                    historial = HistorialEstado(
                        caso_id=caso.id,
                        estado_anterior=estado_anterior,
                        estado_nuevo=nuevo_valor.value,
                        usuario_id=current_user.id,
                        comentario=comentario
                    )
                    db.add(historial)
                setattr(caso, key, nuevo_valor)

            elif key == 'prioridad':
                nuevo_valor = PrioridadEnum[value] if isinstance(value, str) else value
                if caso.prioridad != nuevo_valor:
                    # Registrar evento de cambio de prioridad
                    registrar_evento(
                        db=db,
                        caso_id=caso.id,
                        usuario_id=current_user.id,
                        tipo_evento='cambio_prioridad',
                        campo_modificado='prioridad',
                        valor_anterior=prioridad_anterior,
                        valor_nuevo=nuevo_valor.value,
                        comentario=comentario
                    )
                setattr(caso, key, nuevo_valor)

            elif key == 'agente_asignado_id':
                if agente_anterior_id != value:
                    # Registrar evento de asignación
                    agente_anterior_nombre = ""
                    agente_nuevo_nombre = ""
                    if agente_anterior_id:
                        agente_ant = db.query(Usuario).filter(Usuario.id == agente_anterior_id).first()
                        if agente_ant:
                            agente_anterior_nombre = agente_ant.nombre_completo
                    if value:
                        agente_nuevo = db.query(Usuario).filter(Usuario.id == value).first()
                        if agente_nuevo:
                            agente_nuevo_nombre = agente_nuevo.nombre_completo

                    registrar_evento(
                        db=db,
                        caso_id=caso.id,
                        usuario_id=current_user.id,
                        tipo_evento='asignacion',
                        campo_modificado='agente_asignado',
                        valor_anterior=agente_anterior_nombre or "Sin asignar",
                        valor_nuevo=agente_nuevo_nombre or "Sin asignar",
                        comentario=comentario
                    )
                setattr(caso, key, value)

            elif key == 'descripcion':
                if descripcion_anterior != value:
                    # Registrar evento de edición de descripción
                    registrar_evento(
                        db=db,
                        caso_id=caso.id,
                        usuario_id=current_user.id,
                        tipo_evento='edicion_descripcion',
                        campo_modificado='descripcion',
                        valor_anterior=descripcion_anterior[:100] + "..." if len(descripcion_anterior) > 100 else descripcion_anterior,
                        valor_nuevo=value[:100] + "..." if len(value) > 100 else value,
                        comentario=comentario
                    )
                setattr(caso, key, value)

    # Si se cierra el caso, calcular tiempo de resolución
    if caso.estado == EstadoCasoEnum.CERRADO and not caso.fecha_cierre:
        caso.fecha_cierre = datetime.now(timezone.utc)
        diff = caso.fecha_cierre - caso.fecha_creacion
        caso.tiempo_resolucion_horas = diff.total_seconds() / 3600

    db.commit()
    db.refresh(caso)
    return caso

# ==================== INTERACCIONES ====================

@api_router.get("/interacciones", response_model=List[schemas.Interaccion])
async def listar_interacciones(
    caso_id: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Interaccion)
    if caso_id:
        query = query.filter(Interaccion.caso_id == caso_id)
    return query.order_by(Interaccion.fecha_registro.desc()).all()

@api_router.post("/interacciones", response_model=schemas.Interaccion)
async def crear_interaccion(
    interaccion: schemas.InteraccionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_interaccion = Interaccion(**interaccion.model_dump())
    db.add(db_interaccion)
    db.commit()
    db.refresh(db_interaccion)
    return db_interaccion

# ==================== ALERTAS ====================

@api_router.get("/alertas", response_model=List[schemas.Alerta])
async def listar_alertas(
    leida: Optional[bool] = None,
    tipo: Optional[TipoAlertaEnum] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Alerta)
    if leida is not None:
        query = query.filter(Alerta.leida == leida)
    if tipo:
        query = query.filter(Alerta.tipo_alerta == tipo)
    return query.order_by(Alerta.fecha_creacion.desc()).all()

@api_router.put("/alertas/{alerta_id}/marcar-leida")
async def marcar_alerta_leida(
    alerta_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.leida = True
    alerta.usuario_notificado_id = current_user.id
    db.commit()
    return {"message": "Alerta marcada como leída"}

@api_router.post("/alertas/verificar-sla")
async def verificar_sla(db: Session = Depends(get_db)):
    """Cron job para verificar casos que exceden 5 días"""
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=5)
    
    casos_vencidos = db.query(Caso).filter(
        Caso.estado != EstadoCasoEnum.CERRADO,
        Caso.fecha_creacion <= fecha_limite
    ).all()
    
    for caso in casos_vencidos:
        # Verificar si ya existe alerta
        alerta_existente = db.query(Alerta).filter(
            Alerta.caso_id == caso.id,
            Alerta.tipo_alerta == TipoAlertaEnum.SLA_5_DIAS
        ).first()
        
        if not alerta_existente:
            alerta = Alerta(
                caso_id=caso.id,
                tipo_alerta=TipoAlertaEnum.SLA_5_DIAS,
                leida=False
            )
            db.add(alerta)
    
    db.commit()
    return {"message": f"Se verificaron {len(casos_vencidos)} casos"}

# ==================== MÉTRICAS Y DASHBOARD ====================

@api_router.get("/metricas/dashboard", response_model=schemas.DashboardMetrics)
async def obtener_metricas_dashboard(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hoy_inicio = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = hoy_inicio + timedelta(days=1)
    
    casos_abiertos_hoy = db.query(Caso).filter(
        Caso.fecha_creacion >= hoy_inicio,
        Caso.fecha_creacion < hoy_fin,
        Caso.estado == EstadoCasoEnum.ABIERTO
    ).count()
    
    casos_cerrados_hoy = db.query(Caso).filter(
        Caso.fecha_creacion >= hoy_inicio,
        Caso.fecha_creacion < hoy_fin,
        Caso.estado == EstadoCasoEnum.CERRADO
    ).count()
    
    casos_en_proceso = db.query(Caso).filter(Caso.estado == EstadoCasoEnum.EN_PROCESO).count()
    
    total_casos = db.query(Caso).count()
    
    # Casos cerrados con una sola interacción
    casos_primera_llamada = db.query(Caso).join(Interaccion).filter(
        Caso.estado == EstadoCasoEnum.CERRADO
    ).group_by(Caso.id).having(func.count(Interaccion.id) == 1).count()
    
    total_cerrados = db.query(Caso).filter(Caso.estado == EstadoCasoEnum.CERRADO).count()
    tasa_primera_llamada = (casos_primera_llamada / total_cerrados * 100) if total_cerrados > 0 else 0
    
    # Tiempo promedio de resolución
    avg_tiempo = db.query(func.avg(Caso.tiempo_resolucion_horas)).filter(
        Caso.tiempo_resolucion_horas.isnot(None)
    ).scalar()
    
    alertas_activas = db.query(Alerta).filter(Alerta.leida == False).count()
    
    return {
        "casos_abiertos_hoy": casos_abiertos_hoy,
        "casos_cerrados_hoy": casos_cerrados_hoy,
        "casos_en_proceso": casos_en_proceso,
        "tasa_resolucion_primera_llamada": round(tasa_primera_llamada, 2),
        "tiempo_promedio_resolucion": round(avg_tiempo, 2) if avg_tiempo else 0,
        "total_casos": total_casos,
        "alertas_activas": alertas_activas
    }

@api_router.get("/metricas/casos-por-hora")
async def obtener_casos_por_hora(
    fecha: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fecha_obj = datetime.fromisoformat(fecha)
    fecha_inicio = fecha_obj.replace(hour=0, minute=0, second=0, microsecond=0)
    fecha_fin = fecha_inicio + timedelta(days=1)
    
    resultados = db.query(
        extract('hour', Caso.fecha_creacion).label('hora'),
        func.count(Caso.id).label('cantidad')
    ).filter(
        Caso.fecha_creacion >= fecha_inicio,
        Caso.fecha_creacion < fecha_fin
    ).group_by('hora').order_by('hora').all()
    
    return [{"hora": int(r.hora), "cantidad": r.cantidad} for r in resultados]

@api_router.get("/metricas/casos-por-motivo")
async def obtener_casos_por_motivo(
    inicio: str,
    fin: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fecha_inicio = datetime.fromisoformat(inicio)
    fecha_fin = datetime.fromisoformat(fin)
    
    resultados = db.query(
        MotivoPQR.nombre,
        func.count(Caso.id).label('cantidad')
    ).join(Caso).filter(
        Caso.fecha_creacion >= fecha_inicio,
        Caso.fecha_creacion <= fecha_fin
    ).group_by(MotivoPQR.nombre).order_by(func.count(Caso.id).desc()).limit(10).all()
    
    return [{"motivo": r.nombre, "cantidad": r.cantidad} for r in resultados]

@api_router.get("/metricas/desempeno-agentes")
async def obtener_desempeno_agentes(
    inicio: str,
    fin: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fecha_inicio = datetime.fromisoformat(inicio)
    fecha_fin = datetime.fromisoformat(fin)
    
    resultados = db.query(
        Usuario.nombre_completo,
        func.count(case((Caso.estado == EstadoCasoEnum.ABIERTO, 1))).label('abiertos'),
        func.count(case((Caso.estado == EstadoCasoEnum.CERRADO, 1))).label('cerrados'),
        func.avg(Caso.tiempo_resolucion_horas).label('promedio_horas')
    ).join(Caso, Usuario.id == Caso.agente_asignado_id).filter(
        Caso.fecha_creacion >= fecha_inicio,
        Caso.fecha_creacion <= fecha_fin
    ).group_by(Usuario.nombre_completo).all()
    
    return [{
        "agente": r.nombre_completo,
        "abiertos": r.abiertos,
        "cerrados": r.cerrados,
        "promedio_horas": round(r.promedio_horas, 2) if r.promedio_horas else 0
    } for r in resultados]

@api_router.get("/metricas/tiempo-resolucion")
async def obtener_tiempo_resolucion(
    inicio: str,
    fin: str,
    agrupar_por: str = "general",  # general, motivo, prioridad
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fecha_inicio = datetime.fromisoformat(inicio)
    fecha_fin = datetime.fromisoformat(fin)

    # Calcular promedio general y SLA
    casos_cerrados = db.query(Caso).filter(
        Caso.estado == EstadoCasoEnum.CERRADO,
        Caso.fecha_cierre >= fecha_inicio,
        Caso.fecha_cierre <= fecha_fin,
        Caso.tiempo_resolucion_horas.isnot(None)
    ).all()

    total = len(casos_cerrados)
    if total == 0:
        return {
            "periodo": {"inicio": inicio, "fin": fin},
            "agrupacion": agrupar_por,
            "datos": [],
            "promedio_general": 0,
            "casos_dentro_sla": 0,
            "casos_fuera_sla": 0,
            "porcentaje_cumplimiento_sla": 0
        }

    tiempos = [c.tiempo_resolucion_horas for c in casos_cerrados]
    promedio_general = sum(tiempos) / len(tiempos)
    casos_dentro_sla = sum(1 for t in tiempos if t <= 120)  # 5 días = 120 horas
    casos_fuera_sla = total - casos_dentro_sla

    # Agrupar según el parámetro
    datos = []
    if agrupar_por == "motivo":
        resultados = db.query(
            MotivoPQR.nombre.label('categoria'),
            func.count(Caso.id).label('casos_cerrados'),
            func.avg(Caso.tiempo_resolucion_horas).label('tiempo_promedio'),
            func.min(Caso.tiempo_resolucion_horas).label('tiempo_minimo'),
            func.max(Caso.tiempo_resolucion_horas).label('tiempo_maximo')
        ).join(Caso).filter(
            Caso.estado == EstadoCasoEnum.CERRADO,
            Caso.fecha_cierre >= fecha_inicio,
            Caso.fecha_cierre <= fecha_fin,
            Caso.tiempo_resolucion_horas.isnot(None)
        ).group_by(MotivoPQR.nombre).all()

        datos = [{
            "categoria": r.categoria,
            "casos_cerrados": r.casos_cerrados,
            "tiempo_promedio_horas": round(r.tiempo_promedio, 2),
            "tiempo_minimo_horas": round(r.tiempo_minimo, 2),
            "tiempo_maximo_horas": round(r.tiempo_maximo, 2)
        } for r in resultados]

    elif agrupar_por == "prioridad":
        resultados = db.query(
            Caso.prioridad.label('categoria'),
            func.count(Caso.id).label('casos_cerrados'),
            func.avg(Caso.tiempo_resolucion_horas).label('tiempo_promedio'),
            func.min(Caso.tiempo_resolucion_horas).label('tiempo_minimo'),
            func.max(Caso.tiempo_resolucion_horas).label('tiempo_maximo')
        ).filter(
            Caso.estado == EstadoCasoEnum.CERRADO,
            Caso.fecha_cierre >= fecha_inicio,
            Caso.fecha_cierre <= fecha_fin,
            Caso.tiempo_resolucion_horas.isnot(None)
        ).group_by(Caso.prioridad).all()

        datos = [{
            "categoria": r.categoria.value,
            "casos_cerrados": r.casos_cerrados,
            "tiempo_promedio_horas": round(r.tiempo_promedio, 2),
            "tiempo_minimo_horas": round(r.tiempo_minimo, 2),
            "tiempo_maximo_horas": round(r.tiempo_maximo, 2)
        } for r in resultados]

    return {
        "periodo": {"inicio": inicio, "fin": fin},
        "agrupacion": agrupar_por,
        "datos": datos,
        "promedio_general": round(promedio_general, 2),
        "casos_dentro_sla": casos_dentro_sla,
        "casos_fuera_sla": casos_fuera_sla,
        "porcentaje_cumplimiento_sla": round(casos_dentro_sla / total * 100, 2)
    }

@api_router.get("/metricas/tendencia-historica")
async def obtener_tendencia_historica(
    inicio: str,
    fin: str,
    agrupar_por: str = "dia",  # dia, semana, mes
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fecha_inicio = datetime.fromisoformat(inicio)
    fecha_fin = datetime.fromisoformat(fin)

    if agrupar_por == "dia":
        resultados = db.query(
            func.date(Caso.fecha_creacion).label('periodo'),
            func.count(Caso.id).label('casos_abiertos'),
            func.count(case((Caso.estado == EstadoCasoEnum.CERRADO, 1))).label('casos_cerrados')
        ).filter(
            Caso.fecha_creacion >= fecha_inicio,
            Caso.fecha_creacion <= fecha_fin
        ).group_by(func.date(Caso.fecha_creacion)).order_by('periodo').all()

        datos = [{
            "periodo": str(r.periodo),
            "casos_abiertos": r.casos_abiertos,
            "casos_cerrados": r.casos_cerrados,
            "casos_pendientes": r.casos_abiertos - r.casos_cerrados
        } for r in resultados]

    return {
        "periodo": {"inicio": inicio, "fin": fin},
        "agrupacion": agrupar_por,
        "datos": datos
    }

# ==================== REPORTES ====================

from reportes_service import ReportesService
from fastapi.responses import StreamingResponse

@api_router.post("/reportes/generar")
async def generar_reporte(
    tipo_reporte: str,
    formato: str,  # pdf o excel
    fecha_inicio: str,
    fecha_fin: str,
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Genera reportes en PDF o Excel"""

    if tipo_reporte == "desempeno_agentes":
        # Obtener datos
        fecha_ini = datetime.fromisoformat(fecha_inicio)
        fecha_f = datetime.fromisoformat(fecha_fin)

        resultados = db.query(
            Usuario.nombre_completo,
            func.count(case((Caso.estado == EstadoCasoEnum.ABIERTO, 1))).label('abiertos'),
            func.count(case((Caso.estado == EstadoCasoEnum.CERRADO, 1))).label('cerrados'),
            func.avg(Caso.tiempo_resolucion_horas).label('promedio_horas')
        ).join(Caso, Usuario.id == Caso.agente_asignado_id).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f
        ).group_by(Usuario.nombre_completo).all()

        datos = {
            "agentes": [{
                "agente": r.nombre_completo,
                "abiertos": r.abiertos,
                "cerrados": r.cerrados,
                "promedio_horas": round(r.promedio_horas, 2) if r.promedio_horas else 0
            } for r in resultados]
        }

        # Generar reporte
        if formato == "pdf":
            buffer = ReportesService.generar_pdf_desempeno_agentes(datos, fecha_inicio, fecha_fin)
            filename = f"reporte_desempeno_agentes_{fecha_inicio}_{fecha_fin}.pdf"
            media_type = "application/pdf"
        else:
            buffer = ReportesService.generar_excel_desempeno_agentes(datos, fecha_inicio, fecha_fin)
            filename = f"reporte_desempeno_agentes_{fecha_inicio}_{fecha_fin}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif tipo_reporte == "casos_periodo":
        # Obtener datos
        fecha_ini = datetime.fromisoformat(fecha_inicio)
        fecha_f = datetime.fromisoformat(fecha_fin)

        total_casos = db.query(Caso).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f
        ).count()

        abiertos = db.query(Caso).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f,
            Caso.estado == EstadoCasoEnum.ABIERTO
        ).count()

        cerrados = db.query(Caso).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f,
            Caso.estado == EstadoCasoEnum.CERRADO
        ).count()

        en_proceso = db.query(Caso).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f,
            Caso.estado == EstadoCasoEnum.EN_PROCESO
        ).count()

        avg_tiempo = db.query(func.avg(Caso.tiempo_resolucion_horas)).filter(
            Caso.fecha_creacion >= fecha_ini,
            Caso.fecha_creacion <= fecha_f,
            Caso.tiempo_resolucion_horas.isnot(None)
        ).scalar()

        datos = {
            "total_casos": total_casos,
            "abiertos": abiertos,
            "cerrados": cerrados,
            "en_proceso": en_proceso,
            "tiempo_promedio": avg_tiempo or 0
        }

        # Generar reporte
        if formato == "pdf":
            buffer = ReportesService.generar_pdf_casos_periodo(datos, fecha_inicio, fecha_fin)
            filename = f"reporte_casos_periodo_{fecha_inicio}_{fecha_fin}.pdf"
            media_type = "application/pdf"
        else:
            # Por ahora solo PDF, puedes agregar Excel después
            raise HTTPException(status_code=400, detail="Formato no soportado para este reporte")

        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else:
        raise HTTPException(status_code=400, detail="Tipo de reporte no soportado")

# ==================== MOTIVOS ====================

@api_router.get("/motivos", response_model=List[schemas.MotivoPQR])
async def listar_motivos(
    activo: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MotivoPQR)
    if activo is not None:
        query = query.filter(MotivoPQR.activo == activo)
    return query.order_by(MotivoPQR.orden).all()

@api_router.post("/motivos", response_model=schemas.MotivoPQR)
async def crear_motivo(
    motivo: schemas.MotivoPQRCreate,
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    db_motivo = MotivoPQR(**motivo.model_dump())
    db.add(db_motivo)
    db.commit()
    db.refresh(db_motivo)
    return db_motivo

@api_router.put("/motivos/{motivo_id}", response_model=schemas.MotivoPQR)
async def actualizar_motivo(
    motivo_id: int,
    motivo: schemas.MotivoPQRCreate,
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    db_motivo = db.query(MotivoPQR).filter(MotivoPQR.id == motivo_id).first()
    if not db_motivo:
        raise HTTPException(status_code=404, detail="Motivo no encontrado")
    
    for key, value in motivo.model_dump().items():
        setattr(db_motivo, key, value)
    
    db.commit()
    db.refresh(db_motivo)
    return db_motivo

# ==================== USUARIOS ====================

@api_router.get("/usuarios", response_model=List[schemas.Usuario])
async def listar_usuarios(
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    return db.query(Usuario).all()

@api_router.post("/usuarios", response_model=schemas.Usuario)
async def crear_usuario(
    usuario: schemas.UsuarioCreate,
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Verificar si ya existe
    existe = db.query(Usuario).filter(
        or_(Usuario.username == usuario.username, Usuario.email == usuario.email)
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")
    
    usuario_dict = usuario.model_dump()
    password = usuario_dict.pop('password')
    
    db_usuario = Usuario(
        **usuario_dict,
        password_hash=get_password_hash(password),
        activo=True
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

@api_router.put("/usuarios/{usuario_id}", response_model=schemas.Usuario)
async def actualizar_usuario(
    usuario_id: int,
    usuario_update: schemas.UsuarioUpdate,
    current_user: Usuario = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    db_usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = usuario_update.model_dump(exclude_unset=True)
    if 'password' in update_data:
        update_data['password_hash'] = get_password_hash(update_data.pop('password'))
    
    for key, value in update_data.items():
        setattr(db_usuario, key, value)
    
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

# ==================== UBICACIONES ====================

@api_router.get("/ubicaciones/departamentos", response_model=List[schemas.Departamento])
async def listar_departamentos(db: Session = Depends(get_db)):
    return db.query(Departamento).order_by(Departamento.nombre).all()

@api_router.get("/ubicaciones/ciudades", response_model=List[schemas.Ciudad])
async def listar_ciudades(
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ciudad)
    if departamento_id:
        query = query.filter(Ciudad.departamento_id == departamento_id)
    return query.order_by(Ciudad.nombre).all()

# ==================== CONFIGURACIÓN ====================

# Incluir el router en la app
app.include_router(api_router)

# Middleware CORS
cors_origins_str = os.environ.get('CORS_ORIGINS', '*')
cors_origins = [origin.strip() for origin in cors_origins_str.split(',')]
logger.info(f"Configurando CORS con orígenes: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Iniciando servidor LOGIFARMA PQR...")
    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    logger.info("Servidor iniciado correctamente")

@app.get("/")
async def root():
    return {"message": "LOGIFARMA PQR API - Sistema de Gestión de PQR"}
