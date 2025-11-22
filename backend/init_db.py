from database import engine, Base, SessionLocal
from models import Usuario, Departamento, Ciudad, MotivoPQR, RolEnum
from passlib.context import CryptContext
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_database():
    logger.info("Creando tablas...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tablas creadas exitosamente")
    
    db = SessionLocal()
    try:
        # Verificar si ya hay datos
        if db.query(Usuario).count() > 0:
            logger.info("La base de datos ya contiene datos. Omitiendo inicialización.")
            return
        
        # Crear usuario administrador por defecto
        logger.info("Creando usuario administrador...")
        admin = Usuario(
            username="admin",
            password_hash=pwd_context.hash("admin123"),
            nombre_completo="Administrador Sistema",
            email="admin@logifarma.com",
            rol=RolEnum.ADMINISTRADOR,
            activo=True
        )
        db.add(admin)
        
        # Crear usuario agente de prueba
        logger.info("Creando usuario agente...")
        agente = Usuario(
            username="jagente",
            password_hash=pwd_context.hash("agente123"),
            nombre_completo="Juan Agente",
            email="jagente@logifarma.com",
            rol=RolEnum.AGENTE,
            activo=True
        )
        db.add(agente)
        
        # Crear motivos de PQR
        logger.info("Creando motivos de PQR...")
        motivos = [
            MotivoPQR(nombre="Demora en la entrega de medicamento", orden=1, activo=True),
            MotivoPQR(nombre="Medicamento agotado", orden=2, activo=True),
            MotivoPQR(nombre="Novedad en la fórmula", orden=3, activo=True),
            MotivoPQR(nombre="Usuario sin radicar", orden=4, activo=True),
            MotivoPQR(nombre="Solicitud de entrega de pendientes", orden=5, activo=True),
            MotivoPQR(nombre="Demora en el domicilio", orden=6, activo=True),
            MotivoPQR(nombre="Medicamento en devolución", orden=7, activo=True),
            MotivoPQR(nombre="Solicitud de información", orden=8, activo=True),
            MotivoPQR(nombre="Solicitud de PQR", orden=9, activo=True),
        ]
        for motivo in motivos:
            db.add(motivo)
        
        # Crear departamentos y ciudades de Colombia
        logger.info("Creando departamentos y ciudades de Colombia...")
        departamentos_ciudades = {
            "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre"],
            "Bogotá D.C.": ["Bogotá"],
            "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Rionegro"],
            "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago"],
            "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga"],
            "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"],
            "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona"],
            "Cundinamarca": ["Soacha", "Fusagasugá", "Facatativá", "Chía", "Zipaquirá"],
            "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
            "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda"],
            "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
            "Caldas": ["Manizales", "Villamaría", "La Dorada", "Chinchiná"],
            "Nariño": ["Pasto", "Tumaco", "Ipiales", "Túquerres"],
            "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
            "Meta": ["Villavicencio", "Acacías", "Granada", "San Martín"],
            "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún"],
            "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "Plato"],
            "Cesar": ["Valledupar", "Aguachica", "Bosconia", "Codazzi"],
            "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Montenegro"],
            "Sucre": ["Sincelejo", "Corozal", "Sampués", "Tolú"],
        }
        
        for dept_nombre, ciudades in departamentos_ciudades.items():
            dept = Departamento(nombre=dept_nombre)
            db.add(dept)
            db.flush()  # Para obtener el ID del departamento
            
            for ciudad_nombre in ciudades:
                ciudad = Ciudad(nombre=ciudad_nombre, departamento_id=dept.id)
                db.add(ciudad)
        
        db.commit()
        logger.info("Base de datos inicializada exitosamente")
        logger.info("Usuario admin creado - username: admin, password: admin123")
        logger.info("Usuario agente creado - username: jagente, password: agente123")
        
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
