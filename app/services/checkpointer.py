"""
app/services/checkpointer.py - PostgreSQL Checkpointer para LangGraph
"""
from typing import Optional, Dict, Any, Iterator
from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
import json
import pickle
from datetime import datetime, timezone
from contextlib import asynccontextmanager


class PostgresCheckpointer(BaseCheckpointSaver):
    
    def __init__(self, connection_string: str):
        super().__init__()
        self.engine = create_async_engine(
            connection_string,
            pool_size=1,
            max_overflow=0,
            pool_pre_ping=True,
            pool_recycle=900
        )
    
    @asynccontextmanager
    async def _get_session(self):
        async_session = async_sessionmaker(self.engine, expire_on_commit=False)
        async with async_session() as session:
            yield session
    
    async def aput(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        
        checkpoint_id = f"{checkpoint['id']}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        parent_id = config["configurable"].get("checkpoint_id")
        
        checkpoint_data = pickle.dumps({
            "checkpoint": checkpoint,
            "metadata": metadata,
            "new_versions": new_versions or {}
        })
        # es correcto rremplzar datetime.utcnow().timestamp() por datetime.now(timezone.utc).timestamp()
        async with self._get_session() as session:
            await session.execute(
                text("""
                    INSERT INTO graph_checkpoints 
                    (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, 
                     checkpoint_data, metadata)
                    VALUES (:thread_id, :checkpoint_ns, :checkpoint_id, :parent_id,
                            :checkpoint_data, :metadata)
                    ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) 
                    DO UPDATE SET 
                        checkpoint_data = EXCLUDED.checkpoint_data,
                        metadata = EXCLUDED.metadata,
                        created_at = CURRENT_TIMESTAMP
                """),
                {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                    "parent_id": parent_id,
                    "checkpoint_data": checkpoint_data,
                    "metadata": json.dumps(metadata or {})
                }
            )
            await session.commit()
        
        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        }
    
    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.aput(config, checkpoint, metadata, new_versions))
    
    async def aget_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id = config["configurable"].get("checkpoint_id")
        
        if checkpoint_id:
            query = """
                SELECT checkpoint_data, metadata, checkpoint_id, parent_checkpoint_id
                FROM graph_checkpoints
                WHERE thread_id = :thread_id 
                    AND checkpoint_ns = :checkpoint_ns
                    AND checkpoint_id = :checkpoint_id
            """
            params = {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id
            }
        else:
            query = """
                SELECT checkpoint_data, metadata, checkpoint_id, parent_checkpoint_id
                FROM graph_checkpoints
                WHERE thread_id = :thread_id 
                    AND checkpoint_ns = :checkpoint_ns
                ORDER BY created_at DESC
                LIMIT 1
            """
            params = {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns
            }
        
        async with self._get_session() as session:
            result = await session.execute(text(query), params)
            row = result.fetchone()
        
        if not row:
            return None
        
        data = pickle.loads(row[0])
        checkpoint = data["checkpoint"]
        metadata = data.get("metadata", {})
        
        current_config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": row[2]
            }
        }
        
        parent_config = None
        if row[3]:
            parent_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": row[3]
                }
            }
        
        return CheckpointTuple(current_config, checkpoint, metadata, parent_config)
    
    def get_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.aget_tuple(config))
    
    async def alist(
        self,
        config: Dict[str, Any],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
        
        query = """
            SELECT checkpoint_data, metadata, checkpoint_id, parent_checkpoint_id
            FROM graph_checkpoints
            WHERE thread_id = :thread_id AND checkpoint_ns = :checkpoint_ns
            ORDER BY created_at DESC
        """
        params = {"thread_id": thread_id, "checkpoint_ns": checkpoint_ns}
        
        if limit:
            query += f" LIMIT {limit}"
        
        async with self._get_session() as session:
            result = await session.execute(text(query), params)
            rows = result.fetchall()
        
        tuples = []
        for row in rows:
            data = pickle.loads(row[0])
            checkpoint = data["checkpoint"]
            metadata = data.get("metadata", {})
            
            current_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": row[2]
                }
            }
            
            parent_config = None
            if row[3]:
                parent_config = {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": row[3]
                    }
                }
            
            tuples.append(CheckpointTuple(current_config, checkpoint, metadata, parent_config))
        
        return iter(tuples)
    
    def list(
        self,
        config: Dict[str, Any],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.alist(config, filter=filter, before=before, limit=limit))


async def create_checkpointer(connection_string: str) -> PostgresCheckpointer:
    return PostgresCheckpointer(connection_string)