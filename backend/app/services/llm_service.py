# app/services/llm_service.py

import httpx
from app.models.models import Cepa
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class LLMService:
    """Servicio para generar respuestas usando Groq API"""
    
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    def __init__(self, api_key: str, model: str, temperature: float = 0.2, max_tokens: int = 1000):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
    
    def _construir_contexto_completo(self, todas_cepas: List[Cepa]) -> str:
        """
        Construye contexto con TODAS las cepas de forma compacta.
        Formato optimizado para reducir tokens.
        """
        if not todas_cepas:
            return "La base de datos está vacía."
        
        contexto_partes = [
            f"BASE DE DATOS COMPLETA: {len(todas_cepas)} cepas bacterianas\n",
            "=" * 60
        ]
        
        for i, cepa in enumerate(todas_cepas, 1):
            # Línea principal compacta
            linea = f"\n{i}. {cepa.cepa or 'Sin nombre'}"
            
            # Datos principales en una línea
            datos = []
            if cepa.codigo_lab:
                datos.append(f"Cód:{cepa.codigo_lab}")
            if cepa.origen:
                datos.append(f"Origen:{cepa.origen}")
            if cepa.gram:
                datos.append(f"Gram:{cepa.gram}")
            if cepa.morfologia_1:
                datos.append(f"Morf:{cepa.morfologia_1}")
            
            if datos:
                linea += f" | {' | '.join(datos)}"
            
            # Pruebas bioquímicas (solo positivos, compacto)
            pruebas_pos = self._get_pruebas_positivas(cepa)
            if pruebas_pos:
                linea += f"\n   ✓ {', '.join(pruebas_pos)}"
            
            # Temperaturas
            temps = []
            if cepa.temp_5c: temps.append(f"5°C:{cepa.temp_5c}")
            if cepa.temp_25c: temps.append(f"25°C:{cepa.temp_25c}")
            if cepa.temp_37c: temps.append(f"37°C:{cepa.temp_37c}")
            if temps:
                linea += f"\n   🌡 {' | '.join(temps)}"
            
            # Antibióticos (compacto)
            antibioticos = self._get_antibioticos(cepa)
            if antibioticos:
                linea += f"\n   💊 {' | '.join(antibioticos)}"
            
            # Campos dinámicos relevantes
            dinamicos = self._get_campos_dinamicos_relevantes(cepa)
            if dinamicos:
                linea += f"\n   📋 {' | '.join(dinamicos)}"
            
            contexto_partes.append(linea)
        
        return "\n".join(contexto_partes)
    
    def _construir_contexto_hibrido(
        self, 
        todas_cepas: List[Cepa], 
        cepas_relevantes: List[Cepa]
    ) -> str:
        """
        Contexto híbrido: resumen global + detalles de relevantes.
        Mejor para bases de datos grandes (>50 cepas).
        """
        contexto_partes = [
            f"📊 RESUMEN GLOBAL: {len(todas_cepas)} cepas en total\n"
        ]
        
        # Estadísticas globales
        stats = self._calcular_estadisticas_globales(todas_cepas)
        contexto_partes.append("ESTADÍSTICAS:")
        for key, value in stats.items():
            contexto_partes.append(f"  • {key}: {value}")
        
        # Separador
        contexto_partes.append("\n" + "=" * 60)
        contexto_partes.append(f"\n🎯 CEPAS MÁS RELEVANTES ({len(cepas_relevantes)}):\n")
        
        # Detalles de cepas relevantes
        for i, cepa in enumerate(cepas_relevantes, 1):
            contexto_partes.append(f"\n{i}. {cepa.cepa or 'Sin nombre'}")
            
            # Información detallada
            if cepa.codigo_lab:
                contexto_partes.append(f"   Código: {cepa.codigo_lab}")
            if cepa.origen:
                contexto_partes.append(f"   Origen: {cepa.origen}")
            if cepa.gram:
                contexto_partes.append(f"   Gram: {cepa.gram}")
            if cepa.morfologia_1:
                contexto_partes.append(f"   Morfología: {cepa.morfologia_1}")
            if cepa.pigmentacion:
                contexto_partes.append(f"   Pigmentación: {cepa.pigmentacion}")
            
            # Pruebas bioquímicas
            pruebas = self._get_pruebas_positivas(cepa)
            if pruebas:
                contexto_partes.append(f"   Pruebas positivas: {', '.join(pruebas)}")
            
            # Temperaturas
            if cepa.temp_5c or cepa.temp_25c or cepa.temp_37c:
                temps = []
                if cepa.temp_5c: temps.append(f"5°C: {cepa.temp_5c}")
                if cepa.temp_25c: temps.append(f"25°C: {cepa.temp_25c}")
                if cepa.temp_37c: temps.append(f"37°C: {cepa.temp_37c}")
                contexto_partes.append(f"   Temperaturas: {' | '.join(temps)}")
            
            # Antibióticos
            antibioticos = self._get_antibioticos(cepa)
            if antibioticos:
                contexto_partes.append(f"   Resistencia antibióticos: {', '.join(antibioticos)}")
            
            # Campos adicionales
            dinamicos = self._get_campos_dinamicos_detallados(cepa)
            if dinamicos:
                contexto_partes.append("   Información adicional:")
                for campo, valor in dinamicos.items():
                    contexto_partes.append(f"     - {campo}: {valor}")
        
        return "\n".join(contexto_partes)
    
    def _calcular_estadisticas_globales(self, cepas: List[Cepa]) -> Dict[str, str]:
        """Calcula estadísticas resumidas de todas las cepas"""
        stats = {}
        
        # Conteo por origen
        origenes = {}
        for cepa in cepas:
            if cepa.origen:
                origenes[cepa.origen] = origenes.get(cepa.origen, 0) + 1
        if origenes:
            top_origenes = sorted(origenes.items(), key=lambda x: x[1], reverse=True)[:3]
            stats["Principales orígenes"] = ", ".join([f"{o} ({c})" for o, c in top_origenes])
        
        # Conteo por Gram
        gram_pos = sum(1 for c in cepas if c.gram and "pos" in c.gram.lower())
        gram_neg = sum(1 for c in cepas if c.gram and "neg" in c.gram.lower())
        if gram_pos or gram_neg:
            stats["Gram"] = f"Positivas: {gram_pos}, Negativas: {gram_neg}"
        
        # Morfologías comunes
        morfologias = {}
        for cepa in cepas:
            if cepa.morfologia_1:
                morfologias[cepa.morfologia_1] = morfologias.get(cepa.morfologia_1, 0) + 1
        if morfologias:
            top_morf = sorted(morfologias.items(), key=lambda x: x[1], reverse=True)[:3]
            stats["Morfologías comunes"] = ", ".join([f"{m} ({c})" for m, c in top_morf])
        
        return stats
    
    def _get_pruebas_positivas(self, cepa: Cepa) -> List[str]:
        """Obtiene pruebas bioquímicas positivas"""
        pruebas = [
            "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
            "catalasa", "celulasa", "fosfatasa", "aia"
        ]
        positivas = []
        for prueba in pruebas:
            valor = getattr(cepa, prueba, None)
            if valor and str(valor).lower() in ["positivo", "+", "si", "yes", "s", "y"]:
                positivas.append(prueba.title())
        return positivas
    
    def _get_antibioticos(self, cepa: Cepa) -> List[str]:
        """Obtiene resistencia a antibióticos"""
        antibioticos_map = {
            "amp": "Ampicilina", "ctx": "Cefotaxima", "cxm": "Cefuroxima",
            "caz": "Ceftazidima", "ak": "Amikacina", "c": "Cloranfenicol",
            "te": "Tetraciclina", "am_ecoli": "vs E.coli", "am_saureus": "vs S.aureus"
        }
        resistencias = []
        for codigo, nombre in antibioticos_map.items():
            valor = getattr(cepa, codigo, None)
            if valor:
                resistencias.append(f"{nombre}:{valor}")
        return resistencias
    
    def _get_campos_dinamicos_relevantes(self, cepa: Cepa) -> List[str]:
        """Obtiene campos dinámicos en formato compacto"""
        campos_base = {
            "id", "embedding", "fecha_creacion", "fecha_actualizacion",
            "cepa", "codigo_lab", "origen", "latitud", "longitud",
            "gram", "morfologia_1", "morfologia_2", "pigmentacion",
            "temp_5c", "temp_25c", "temp_37c",
            "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
            "catalasa", "celulasa", "fosfatasa", "aia",
            "amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus",
            "envio_punta_arenas", "temperatura_80", "medio"
        }
        
        dinamicos = []
        for key, value in cepa.model_dump(exclude=campos_base).items():
            if value is not None and str(value).strip():
                dinamicos.append(f"{key.replace('_', ' ')}:{value}")
        
        return dinamicos
    
    def _get_campos_dinamicos_detallados(self, cepa: Cepa) -> Dict[str, Any]:
        """Obtiene campos dinámicos en formato detallado"""
        campos_base = {
            "id", "embedding", "fecha_creacion", "fecha_actualizacion",
            "cepa", "codigo_lab", "origen", "latitud", "longitud",
            "gram", "morfologia_1", "morfologia_2", "pigmentacion",
            "temp_5c", "temp_25c", "temp_37c",
            "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
            "catalasa", "celulasa", "fosfatasa", "aia",
            "amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus",
            "envio_punta_arenas", "temperatura_80", "medio",
            "gen_16s", "metabolomica", "nicolas", "nombre_proyecto"
        }
        
        dinamicos = {}
        for key, value in cepa.model_dump(exclude=campos_base).items():
            if value is not None and str(value).strip():
                dinamicos[key.replace('_', ' ').title()] = value
        
        return dinamicos
    
    def _construir_system_prompt(
        self,
        modo: str = "semántico",
        n_cepas: int = 0,
        total_en_db: int = 0,
    ) -> str:
        """Prompt del sistema adaptado al modo de búsqueda."""
        base_prompt = (
            "Eres un asistente experto en microbiología con acceso directo a la base de datos "
            "de cepas bacterianas del laboratorio. Puedes consultar, filtrar y analizar "
            "todos los registros de la colección en tiempo real.\n\n"
            "TUS RESPONSABILIDADES:\n"
            "- Responder preguntas sobre las cepas usando los datos de la base de datos\n"
            "- Proporcionar información precisa sobre taxonomía, características, "
            "pruebas bioquímicas y resistencia antimicrobiana\n"
            "- Realizar análisis comparativos y estadísticos cuando se solicite\n"
            "- Usar terminología científica correcta"
        )

        if modo == "estadístico":
            base_prompt += (
                f"\n\nDATA: Has consultado la base de datos y encontraste exactamente "
                f"{n_cepas} cepas que cumplen los criterios (de {total_en_db} en total).\n"
                f"- Usa ese número exacto al responder. No estimes ni aproximes."
            )
        elif modo in ("híbrido", "híbrido_sin_vector"):
            base_prompt += (
                f"\n\nDATA: La base de datos contiene {total_en_db} cepas en total. "
                f"Has filtrado y recuperado {n_cepas} cepas relevantes para esta consulta."
            )
        elif modo in ("semántico", "semántico_fallback"):
            base_prompt += (
                f"\n\nDATA: La base de datos contiene {total_en_db} cepas en total. "
                f"Has recuperado las {n_cepas} más relevantes para esta consulta."
            )

        base_prompt += (
            "\n\nFORMATO DE RESPUESTA:\n"
            "- Responde en español de forma clara y estructurada\n"
            "- Habla siempre en primera persona como si consultaras la base de datos directamente "
            "(ej: 'En la base de datos hay...', 'He encontrado X cepas...', 'Los registros muestran...')\n"
            "- Incluye códigos de cepa cuando sea relevante\n"
            "- Para conteos y estadísticas, sé preciso con los números\n"
            "- Si no tienes datos suficientes para responder, indícalo\n\n"
            "PROHIBIDO — nunca uses estas frases ni similares:\n"
            "- 'según el contexto', 'de acuerdo al contexto', 'en el contexto proporcionado'\n"
            "- 'según la información proporcionada', 'basándome en el contexto'\n"
            "- 'las cepas listadas', 'las cepas del contexto', 'cepas bacterianas listadas'\n"
            "- 'información del contexto', 'datos del contexto'\n"
            "- Cualquier frase que revele que trabajas con un subconjunto o contexto limitado"
        )
        return base_prompt
    
# app/services/llm_service.py (agregar logging en generar_respuesta)

    async def generar_respuesta(
        self,
        pregunta: str,
        cepas: List[Cepa],
        modo: str = "semántico",
        total_en_db: int = 0,
    ) -> Dict[str, Any]:
        """Genera respuesta usando Groq API con contexto adaptado al modo de búsqueda."""

        logger.info("🤖 Iniciando generación de respuesta con LLM")
        logger.info(f"   Modo de búsqueda: {modo}")
        logger.info(f"   Cepas en contexto: {len(cepas)}")
        logger.info(f"   Total en DB: {total_en_db}")

        contexto = self._construir_contexto_completo(cepas)
        system_prompt = self._construir_system_prompt(
            modo=modo,
            n_cepas=len(cepas),
            total_en_db=total_en_db,
        )

        messages = [
            {"role": "system", "content": f"{system_prompt}\n\nCONTEXTO:\n{contexto}"},
            {"role": "user", "content": pregunta}
        ]


        logger.info("📨 Preparando request a Groq API:")
        logger.info(f"   Endpoint: {self.BASE_URL}")
        logger.info(f"   Modelo: {self.model}")
        logger.info(f"   Temperature: {self.temperature}")
        logger.info(f"   Max tokens: {self.max_tokens}")

        try:
            logger.info("⏳ Enviando request a Groq...")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.BASE_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens,
                        "top_p": 1,
                        "stream": False
                    }
                )

                logger.info(f"📥 Respuesta recibida: HTTP {response.status_code}")

                response.raise_for_status()
                data = response.json()

                respuesta_texto = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                tokens_enviados   = usage.get("prompt_tokens")
                tokens_recibidos  = usage.get("completion_tokens")
                tokens_total      = usage.get("total_tokens")

                logger.info("✅ Respuesta generada exitosamente")
                logger.info(f"   Longitud respuesta: {len(respuesta_texto)} caracteres")
                logger.info(f"   Tokens enviados (prompt):    {tokens_enviados}")
                logger.info(f"   Tokens recibidos (completion): {tokens_recibidos}")
                logger.info(f"   Tokens totales:              {tokens_total}")
                logger.debug(f"   Respuesta (primeros 200 chars): {respuesta_texto[:200]}...")

                return {
                    "respuesta": respuesta_texto,
                    "modelo": data["model"],
                    "tokens_enviados": tokens_enviados,
                    "tokens_recibidos": tokens_recibidos,
                    "tokens_usados": tokens_total,
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Error HTTP de Groq: {e.response.status_code}")
            logger.error(f"   Response: {e.response.text}")
            raise Exception(f"Error al consultar Groq API: {e.response.status_code}")

        except httpx.TimeoutException:
            logger.error("❌ Timeout al consultar Groq API")
            raise Exception("Timeout al generar respuesta. Intenta de nuevo.")

        except Exception as e:
            logger.error(f"❌ Error inesperado: {type(e).__name__}: {str(e)}", exc_info=True)
            raise Exception(f"Error al generar respuesta: {str(e)}")
        
def get_llm_service(api_key: str, model: str, temperature: float = 0.2, max_tokens: int = 1000) -> LLMService:
    """Factory function para crear instancia del servicio LLM"""
    return LLMService(api_key, model, temperature, max_tokens)