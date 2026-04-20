# app/ia/services/chat/mql_executor_service.py
"""
Executes validated MongoDB queries against the 'cepas' collection
and returns cleaned results (embedding and raw _id excluded).
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.models.models import Cepa
from app.ia.config import ia_settings as settings

logger = logging.getLogger(__name__)


class MQLExecutionError(Exception):
    pass


class MQLExecutor:

    async def execute(self, validated_query: dict) -> dict[str, Any]:
        """
        Executes a validated 'find' or 'aggregate' query.
        Returns {"results": [...], "count": N, "query_type": str}.
        """
        query_type = validated_query["type"]
        collection = Cepa.get_pymongo_collection()

        logger.info("━" * 60)
        logger.info(f"🗄️  [MQL] CONSULTA A MONGODB (tipo: {query_type})")

        if query_type == "find":
            filter_ = validated_query.get("filter", {})
            limit = min(
                int(validated_query.get("limit", settings.MQL_MAX_RESULTS)),
                settings.MQL_MAX_RESULTS,
            )
            logger.info(
                f"   Filter  : {json.dumps(filter_, ensure_ascii=False)}\n"
                f"   Limit   : {limit}"
            )
        else:
            pipeline_original = validated_query.get("pipeline", [])
            logger.info(
                f"   Pipeline original ({len(pipeline_original)} etapas):\n"
                + json.dumps(pipeline_original, ensure_ascii=False, indent=2)
            )

        try:
            if query_type == "find":
                raw = await self._execute_find(collection, validated_query)
            else:
                raw = await self._execute_aggregate(collection, validated_query)
        except Exception as exc:
            logger.error(f"❌ [MQL] Error ejecutando en MongoDB: {exc}", exc_info=True)
            raise MQLExecutionError(f"Error al ejecutar la consulta: {exc}") from exc

        results = self._clean(raw)

        logger.info(f"   Documentos retornados: {len(results)}")
        logger.info(
            f"📊 [MQL] Resultados de MongoDB:\n"
            + json.dumps(results, ensure_ascii=False, indent=2, default=str)
        )
        logger.info("━" * 60)

        return {"results": results, "count": len(results), "query_type": query_type}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _execute_find(self, collection, query: dict) -> list[dict]:
        filter_ = self._resolve_dates(query.get("filter", {}))
        limit = min(
            int(query.get("limit", settings.MQL_MAX_RESULTS)),
            settings.MQL_MAX_RESULTS,
        )
        # Exclude the embedding vector from results
        cursor = collection.find(filter_, {"embedding": 0}).limit(limit)
        return await cursor.to_list(length=limit)

    async def _execute_aggregate(self, collection, query: dict) -> list[dict]:
        # Shallow-copy the list so we don't mutate the validated query
        pipeline: list[dict] = self._resolve_dates(list(query["pipeline"]))

        # Strip embedding early to avoid sending large vectors to the LLM
        pipeline.insert(0, {"$project": {"embedding": 0}})

        # Enforce a result cap unless the pipeline already limits itself
        has_limit = any("$limit" in stage for stage in pipeline)
        has_count = any("$count" in stage for stage in pipeline)
        if not has_limit and not has_count:
            pipeline.append({"$limit": settings.MQL_MAX_RESULTS})

        logger.info(
            f"   Pipeline final ejecutado ({len(pipeline)} etapas):\n"
            + json.dumps(pipeline, ensure_ascii=False, indent=2)
        )

        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=settings.MQL_MAX_RESULTS)

    @staticmethod
    def _resolve_dates(obj: Any) -> Any:
        """
        Recursively converts MongoDB Extended JSON date literals
        {"$date": "ISO_STRING"} to Python datetime objects so pymongo
        can compare them against stored ISODate values.
        """
        if isinstance(obj, dict):
            if list(obj.keys()) == ["$date"] and isinstance(obj["$date"], str):
                try:
                    return datetime.fromisoformat(obj["$date"].replace("Z", "+00:00")).replace(
                        tzinfo=None
                    )
                except ValueError:
                    return obj
            return {k: MQLExecutor._resolve_dates(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [MQLExecutor._resolve_dates(item) for item in obj]
        return obj

    @staticmethod
    def _clean(raw: list[dict]) -> list[dict]:
        """Removes embedding field and converts ObjectId to string."""
        cleaned = []
        for doc in raw:
            doc = dict(doc)
            doc.pop("embedding", None)
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            cleaned.append(doc)
        return cleaned


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_instance: MQLExecutor | None = None


def get_mql_executor() -> MQLExecutor:
    global _instance
    if _instance is None:
        _instance = MQLExecutor()
    return _instance
