# app/services/database_service.py

from app.models.models import Cepa
from app.services.embedding_service import get_embedding_service
from typing import List, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseService:
    """Servicio para búsqueda y análisis de cepas"""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
    
    async def get_todas_las_cepas(self) -> List[Cepa]:
        """
        Obtiene TODAS las cepas de la base de datos.
        Usar con precaución en bases de datos grandes.
        """
        todas = await Cepa.find_all().to_list()
        logger.info(f"Obtenidas {len(todas)} cepas de la base de datos")
        return todas
    
    async def buscar_cepas_similares(
        self, 
        pregunta: str, 
        limit: int = 5,
        threshold: float = 0.3
    ) -> List[Cepa]:
        """
        Busca cepas similares usando embeddings.
        Fallback a búsqueda de texto si no hay embeddings.
        """
        try:
            # Generar embedding de la pregunta
            query_embedding = self.embedding_service.encode(pregunta)
            
            # Buscar cepas con embeddings
            cepas_con_embedding = await Cepa.find(
                {"embedding": {"$exists": True}}
            ).to_list()
            
            if cepas_con_embedding:
                logger.info(f"Usando búsqueda vectorial sobre {len(cepas_con_embedding)} cepas")
                return await self._busqueda_vectorial(
                    query_embedding, 
                    cepas_con_embedding, 
                    limit, 
                    threshold
                )
            else:
                logger.warning("No hay embeddings disponibles, usando búsqueda de texto")
                return await self._busqueda_texto(pregunta, limit)
        
        except Exception as e:
            logger.error(f"Error en búsqueda: {str(e)}", exc_info=True)
            return await self._busqueda_texto(pregunta, limit)
    
    async def _busqueda_vectorial(
        self,
        query_embedding: List[float],
        cepas: List[Cepa],
        limit: int,
        threshold: float
    ) -> List[Cepa]:
        """Búsqueda por similitud de embeddings"""
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
        
        resultados.sort(key=lambda x: x[1], reverse=True)
        logger.info(f"Encontradas {len(resultados)} cepas con similitud >= {threshold}")
        
        return [cepa for cepa, _ in resultados[:limit]]
    
    async def _busqueda_texto(self, pregunta: str, limit: int) -> List[Cepa]:
        """Búsqueda tradicional por palabras clave"""
        palabras = [p.strip() for p in pregunta.lower().split() if len(p.strip()) > 2]
        
        if not palabras:
            return await Cepa.find().limit(limit).to_list()
        
        # Query con OR para múltiples campos (incluye campos fijos)
        query = {
            "$or": [
                {"cepa": {"$regex": palabra, "$options": "i"}}
                for palabra in palabras
            ] + [
                {"codigo_lab": {"$regex": palabra, "$options": "i"}}
                for palabra in palabras
            ] + [
                {"origen": {"$regex": palabra, "$options": "i"}}
                for palabra in palabras
            ]
        }
        
        logger.info(f"Búsqueda de texto con {len(palabras)} palabras clave")
        return await Cepa.find(query).limit(limit).to_list()
    
    async def generar_embeddings_batch(self, batch_size: int = 50) -> Tuple[int, float]:
        """
        Genera embeddings para todas las cepas sin embedding.
        Retorna: (cepas_procesadas, tiempo_en_segundos)
        """
        inicio = datetime.utcnow()
        
        cepas_sin_embedding = await Cepa.find(
            {"embedding": {"$exists": False}}
        ).to_list()
        
        total_cepas = len(cepas_sin_embedding)
        logger.info(f"Generando embeddings para {total_cepas} cepas")
        
        if total_cepas == 0:
            return 0, 0.0
        
        procesadas = 0
        
        for i in range(0, total_cepas, batch_size):
            batch = cepas_sin_embedding[i:i+batch_size]
            
            # Crear texto representativo de cada cepa
            textos = [self._cepa_a_texto(cepa) for cepa in batch]
            
            # Generar embeddings
            embeddings = self.embedding_service.encode_batch(textos)
            
            # Actualizar en base de datos
            for cepa, embedding in zip(batch, embeddings):
                await cepa.set({"embedding": embedding})
                procesadas += 1
            
            logger.info(f"Procesadas {procesadas}/{total_cepas} cepas")
        
        tiempo_total = (datetime.utcnow() - inicio).total_seconds()
        logger.info(f"Embeddings generados en {tiempo_total:.2f} segundos")
        
        return procesadas, tiempo_total
    
    async def get_embedding_stats(self) -> dict:
        """Obtiene estadísticas de embeddings"""
        total = await Cepa.count()
        con_embedding = await Cepa.find({"embedding": {"$exists": True}}).count()
        sin_embedding = total - con_embedding
        porcentaje = (con_embedding / total * 100) if total > 0 else 0
        
        return {
            "total_cepas": total,
            "cepas_con_embedding": con_embedding,
            "cepas_sin_embedding": sin_embedding,
            "porcentaje_completado": round(porcentaje, 2)
        }
    
    @staticmethod
    def _cepa_a_texto(cepa: Cepa) -> str:
        """
        Convierte una cepa a texto representativo para embedding.
        Maneja campos dinámicos.
        """
        partes = []
        
        # Campos fijos principales
        if cepa.cepa:
            partes.append(f"Cepa {cepa.cepa}")
        if cepa.codigo_lab:
            partes.append(f"Código {cepa.codigo_lab}")
        if cepa.origen:
            partes.append(f"Origen {cepa.origen}")
        
        # Características morfológicas
        if cepa.gram:
            partes.append(f"Gram {cepa.gram}")
        if cepa.morfologia_1:
            partes.append(f"Morfología {cepa.morfologia_1}")
        if cepa.pigmentacion:
            partes.append(f"Pigmentación {cepa.pigmentacion}")
        
        # Pruebas bioquímicas (solo positivos)
        pruebas = ["lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa", 
                   "catalasa", "celulasa", "fosfatasa", "aia"]
        pruebas_positivas = []
        for prueba in pruebas:
            valor = getattr(cepa, prueba, None)
            if valor and valor.lower() in ["positivo", "+", "si", "yes"]:
                pruebas_positivas.append(prueba)
        if pruebas_positivas:
            partes.append(f"Pruebas positivas: {', '.join(pruebas_positivas)}")
        
        # Campos dinámicos adicionales
        campos_excluidos = {
            "id", "embedding", "fecha_creacion", "fecha_actualizacion",
            "cepa", "codigo_lab", "origen", "gram", "morfologia_1", 
            "morfologia_2", "pigmentacion", "latitud", "longitud"
        } | set(pruebas)
        
        dynamic_attrs = cepa.model_dump(exclude=campos_excluidos)
        for key, value in dynamic_attrs.items():
            if value is not None and str(value).strip():
                partes.append(f"{key.replace('_', ' ')}: {value}")
        
        return " ".join(partes)

def get_database_service() -> DatabaseService:
    return DatabaseService()