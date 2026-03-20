# scripts/debug_chat_flow.py

import asyncio
import sys
from pathlib import Path

# Añadir el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.models import Cepa
from app.services.embedding_service import get_embedding_service
from app.services.dbSearch_service import DatabaseService
from app.services.llm_service import LLMService
from app.core.config import settings
import json


def print_section(title: str):
    """Imprime un separador visual"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")


async def debug_full_flow():
    """Depura el flujo completo del chat"""
    
    # ========================================================================
    # PASO 1: Conectar a la base de datos
    # ========================================================================
    print_section("PASO 1: CONECTANDO A MONGODB")
    
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[Cepa]
    )
    print(f"✓ Conectado a: {settings.mongodb_uri}")
    print(f"✓ Base de datos: {settings.db_name}")
    
    # ========================================================================
    # PASO 2: Obtener cepas de ejemplo
    # ========================================================================
    print_section("PASO 2: OBTENIENDO CEPAS DE LA BASE DE DATOS")
    
    todas_cepas = await Cepa.find_all().to_list()
    print(f"✓ Total de cepas en DB: {len(todas_cepas)}")
    
    if not todas_cepas:
        print("❌ No hay cepas en la base de datos")
        return
    
    # Mostrar primeras 3 cepas
    print(f"\n📋 Mostrando primeras 3 cepas:\n")
    for i, cepa in enumerate(todas_cepas[:3], 1):
        print(f"{i}. Cepa: {cepa.cepa}")
        print(f"   ID: {cepa.id}")
        print(f"   Código Lab: {cepa.codigo_lab}")
        print(f"   Origen: {cepa.origen}")
        print(f"   Gram: {cepa.gram}")
        print(f"   Morfología: {cepa.morfologia_1}")
        print(f"   Tiene embedding: {'✓' if cepa.embedding else '✗'}")
        
        # Mostrar campos dinámicos
        campos_base = {
            "id", "cepa", "codigo_lab", "origen", "latitud", "longitud",
            "gram", "morfologia_1", "morfologia_2", "pigmentacion",
            "embedding", "fecha_creacion", "fecha_actualizacion"
        }
        campos_dinamicos = {k: v for k, v in cepa.model_dump().items() 
                          if k not in campos_base and v is not None}
        
        if campos_dinamicos:
            print(f"   Campos dinámicos: {list(campos_dinamicos.keys())}")
        print()
    
    # ========================================================================
    # PASO 3: Generar embedding para una cepa
    # ========================================================================
    print_section("PASO 3: GENERANDO EMBEDDING PARA UNA CEPA")
    
    cepa_ejemplo = todas_cepas[0]
    print(f"Cepa seleccionada: {cepa_ejemplo.cepa}\n")
    
    # Crear texto representativo
    db_service = DatabaseService()
    texto_para_embedding = db_service._cepa_a_texto(cepa_ejemplo)
    
    print("📝 TEXTO GENERADO PARA EMBEDDING:")
    print("-" * 80)
    print(texto_para_embedding)
    print("-" * 80)
    print(f"\nLongitud del texto: {len(texto_para_embedding)} caracteres")
    
    # Generar embedding
    embedding_service = get_embedding_service()
    print(f"\n🔧 Generando embedding con modelo: {embedding_service.model}")
    
    embedding = embedding_service.encode(texto_para_embedding)
    
    print(f"\n✓ Embedding generado:")
    print(f"  - Dimensiones: {len(embedding)}")
    print(f"  - Tipo: {type(embedding)}")
    print(f"  - Primeros 10 valores: {embedding[:10]}")
    print(f"  - Últimos 10 valores: {embedding[-10:]}")
    print(f"  - Rango: [{min(embedding):.4f}, {max(embedding):.4f}]")
    
    # ========================================================================
    # PASO 4: Buscar cepas similares (usando pregunta de ejemplo)
    # ========================================================================
    print_section("PASO 4: BUSCANDO CEPAS SIMILARES")
    
    pregunta_ejemplo = "¿Qué cepas son Gram positivas?"
    print(f"Pregunta de ejemplo: '{pregunta_ejemplo}'\n")
    
    # Generar embedding de la pregunta
    print("🔧 Generando embedding de la pregunta...")
    embedding_pregunta = embedding_service.encode(pregunta_ejemplo)
    print(f"✓ Embedding de pregunta generado ({len(embedding_pregunta)} dimensiones)")
    
    # Buscar similares
    print("\n🔍 Buscando cepas similares...")
    cepas_similares = await db_service.buscar_cepas_similares(
        pregunta_ejemplo,
        limit=5,
        threshold=0.3
    )
    
    print(f"\n✓ Encontradas {len(cepas_similares)} cepas similares:\n")
    for i, cepa in enumerate(cepas_similares, 1):
        print(f"{i}. {cepa.cepa}")
        print(f"   Código: {cepa.codigo_lab}")
        print(f"   Origen: {cepa.origen}")
        print(f"   Gram: {cepa.gram}")
        
        # Calcular similitud si tiene embedding
        if cepa.embedding:
            similitud = embedding_service.cosine_similarity(
                embedding_pregunta,
                cepa.embedding
            )
            print(f"   Similitud: {similitud:.4f}")
        print()
    
    # ========================================================================
    # PASO 5: Construir contexto para el LLM
    # ========================================================================
    print_section("PASO 5: CONSTRUYENDO CONTEXTO PARA EL LLM")
    
    llm_service = LLMService(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS
    )
    
    # Decidir modo
    usar_modo_completo = len(todas_cepas) <= 50
    print(f"Total de cepas: {len(todas_cepas)}")
    print(f"Modo seleccionado: {'COMPLETO' if usar_modo_completo else 'HÍBRIDO'}\n")
    
    if usar_modo_completo:
        contexto = llm_service._construir_contexto_completo(todas_cepas)
    else:
        contexto = llm_service._construir_contexto_hibrido(todas_cepas, cepas_similares)
    
    print("📄 CONTEXTO GENERADO:")
    print("-" * 80)
    print(contexto)
    print("-" * 80)
    print(f"\nLongitud del contexto: {len(contexto)} caracteres")
    print(f"Tokens aproximados: {len(contexto) // 4}")  # Estimación rough
    
    # ========================================================================
    # PASO 6: Construir mensajes para Groq
    # ========================================================================
    print_section("PASO 6: CONSTRUYENDO MENSAJES PARA GROQ API")
    
    system_prompt = llm_service._construir_system_prompt(
        "completo" if usar_modo_completo else "hibrido"
    )
    
    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": f"{contexto}\n\n{'='*60}\nPREGUNTA: {pregunta_ejemplo}"
        }
    ]
    
    print("🤖 SYSTEM PROMPT:")
    print("-" * 80)
    print(system_prompt)
    print("-" * 80)
    
    print("\n👤 USER MESSAGE (primeros 500 chars):")
    print("-" * 80)
    print(messages[1]["content"][:500] + "...")
    print("-" * 80)
    
    # Mostrar payload completo que se enviará
    payload = {
        "model": llm_service.model,
        "messages": messages,
        "temperature": llm_service.temperature,
        "max_tokens": llm_service.max_tokens,
        "top_p": 1,
        "stream": False
    }
    
    print("\n📦 PAYLOAD COMPLETO (sin messages por brevedad):")
    payload_sin_messages = {k: v for k, v in payload.items() if k != "messages"}
    print(json.dumps(payload_sin_messages, indent=2))
    
    # ========================================================================
    # PASO 7: Llamar a Groq API
    # ========================================================================
    print_section("PASO 7: LLAMANDO A GROQ API")
    
    print(f"🌐 Endpoint: {llm_service.BASE_URL}")
    print(f"🔑 API Key: {settings.GROQ_API_KEY[:20]}...{settings.GROQ_API_KEY[-4:]}")
    print(f"🤖 Modelo: {llm_service.model}")
    print("\n⏳ Enviando request...\n")
    
    try:
        resultado = await llm_service.generar_respuesta(
            pregunta_ejemplo,
            todas_cepas=todas_cepas,
            cepas_relevantes=cepas_similares,
            usar_modo_completo=usar_modo_completo
        )
        
        print("✅ RESPUESTA RECIBIDA:")
        print("-" * 80)
        print(resultado["respuesta"])
        print("-" * 80)
        
        print(f"\n📊 METADATA:")
        print(f"  - Modelo usado: {resultado['modelo']}")
        print(f"  - Tokens usados: {resultado.get('tokens_usados', 'N/A')}")
        print(f"  - Modo contexto: {resultado.get('modo_contexto', 'N/A')}")
        
    except Exception as e:
        print(f"❌ ERROR al llamar a Groq:")
        print(f"  {type(e).__name__}: {str(e)}")
        
        # Verificar API key
        print("\n🔍 VERIFICANDO CONFIGURACIÓN:")
        print(f"  - GROQ_API_KEY está configurada: {'✓' if settings.GROQ_API_KEY else '✗'}")
        print(f"  - Longitud de API key: {len(settings.GROQ_API_KEY)} caracteres")
        
        if len(settings.GROQ_API_KEY) < 30:
            print("  ⚠️  La API key parece muy corta, verifica que sea correcta")
    
    # ========================================================================
    # PASO 8: Resumen
    # ========================================================================
    print_section("RESUMEN DEL FLUJO")
    
    print("✓ 1. Conectado a MongoDB")
    print(f"✓ 2. Obtenidas {len(todas_cepas)} cepas")
    print(f"✓ 3. Generado embedding de {len(embedding)} dimensiones")
    print(f"✓ 4. Encontradas {len(cepas_similares)} cepas similares")
    print(f"✓ 5. Construido contexto de {len(contexto)} caracteres")
    print("✓ 6. Construidos mensajes para LLM")
    print("✓ 7. Llamada a Groq API")
    print("\n✅ Flujo completado")


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║              🔍 DEBUG CHAT IA - FLUJO COMPLETO 🔍                ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
    
    try:
        asyncio.run(debug_full_flow())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrumpido por el usuario")
    except Exception as e:
        print(f"\n\n❌ ERROR FATAL: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()