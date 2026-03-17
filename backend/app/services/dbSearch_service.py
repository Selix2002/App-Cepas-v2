# app/services/database_service.py

from app.models.models import Cepa
from app.services.embedding_service import get_embedding_service
from typing import List, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseService:
    """Servicio para búsqueda semántica de cepas"""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
    
    async def get_todas_las_cepas(self) -> List[Cepa]:
        """Obtiene TODAS las cepas de la base de datos"""
        logger.info("🔍 Obteniendo todas las cepas de la base de datos...")
        todas = await Cepa.find_all().to_list()
        logger.info(f"✅ Obtenidas {len(todas)} cepas")
        
        # Log de muestra
        if todas:
            logger.debug("📋 Muestra de cepas:")
            for i, cepa in enumerate(todas[:3], 1):
                logger.debug(f"   {i}. {cepa.cepa} (ID: {cepa.id})")
        
        return todas
    
    async def buscar_cepas_similares(
        self, 
        pregunta: str, 
        limit: int = 5,
        threshold: float = 0.3
    ) -> List[Cepa]:
        """Busca cepas similares usando embeddings"""
        logger.info(f"🔍 Buscando cepas similares a: '{pregunta[:50]}...'")
        logger.info(f"   Parámetros: limit={limit}, threshold={threshold}")
        
        try:
            # Generar embedding de la pregunta
            logger.debug("📝 Generando embedding de la pregunta...")
            query_embedding = self.embedding_service.encode(pregunta)
            logger.debug(f"✅ Embedding generado: {len(query_embedding)} dimensiones")
            
            # Buscar cepas con embeddings
            cepas_con_embedding = await Cepa.find(
                {"embedding": {"$exists": True}}
            ).to_list()
            
            logger.info(f"📊 Cepas con embedding en DB: {len(cepas_con_embedding)}")
            
            if cepas_con_embedding:
                logger.info("🎯 Usando búsqueda vectorial")
                return await self._busqueda_vectorial(
                    query_embedding, 
                    cepas_con_embedding, 
                    limit, 
                    threshold
                )
            else:
                logger.warning("⚠️  No hay embeddings disponibles, usando búsqueda de texto")
                return await self._busqueda_vectorial(pregunta, limit)
        
        except Exception as e:
            logger.error(f"❌ Error en búsqueda: {str(e)}", exc_info=True)
            return await self._busqueda_vectorial(pregunta, limit)
    
    async def _busqueda_vectorial(
        self,
        query_embedding: List[float],
        cepas: List[Cepa],
        limit: int,
        threshold: float
    ) -> List[Cepa]:
        """Búsqueda por similitud de embeddings"""
        logger.debug(f"🔬 Calculando similitudes con {len(cepas)} cepas...")
        
        resultados = []
        
        for cepa in cepas:
            if not cepa.embedding:
                continue
            
            similitud = self.embedding_service.cosine_similarity(
                query_embedding, 
                cepa.embedding
            )
            
            if similitud >= threshold:
                resultados.append((cepa, similitud))
                logger.debug(f"   ✓ {cepa.cepa}: similitud={similitud:.4f}")
        
        # Ordenar por similitud descendente
        resultados.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"✅ Encontradas {len(resultados)} cepas con similitud >= {threshold}")
        
        if resultados:
            logger.info("🏆 Top 3 más similares:")
            for i, (cepa, sim) in enumerate(resultados[:3], 1):
                logger.info(f"   {i}. {cepa.cepa} - similitud: {sim:.4f}")
        
        return [cepa for cepa, _ in resultados[:limit]]
    
    @staticmethod
    def _cepa_a_texto(cepa: Cepa) -> str:
        """Convierte una cepa a texto representativo para embedding"""
        partes = []
        
        # Campos fijos principales
        if cepa.cepa:
            partes.append(f"Cepa {cepa.cepa}")
        if cepa.codigo_lab:
            partes.append(f"Código {cepa.codigo_lab}")
        if cepa.origen:
            partes.append(f"Origen {cepa.origen}")
        
        # ... resto del código ...
        
        texto_final = " ".join(partes)
        
        logger.debug(f"📄 Texto generado para '{cepa.cepa}':")
        logger.debug(f"   Longitud: {len(texto_final)} caracteres")
        logger.debug(f"   Contenido: {texto_final[:150]}...")
        
        return texto_final
def get_database_service() -> DatabaseService:
    return DatabaseService()