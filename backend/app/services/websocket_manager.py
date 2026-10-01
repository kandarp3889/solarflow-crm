import asyncio
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> Set of active WebSocket instances
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user_id={user_id}. Active sessions for user: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user_id={user_id}")

    async def send_to_user(self, user_id: int, payload: dict):
        if user_id in self.active_connections:
            dead_connections = set()
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(payload)
                except Exception as e:
                    logger.warning(f"Error sending message to user {user_id} over WebSocket: {e}")
                    dead_connections.add(connection)
            for dead in dead_connections:
                self.disconnect(user_id, dead)

ws_manager = ConnectionManager()

def emit_realtime_notification(user_id: int, payload: dict):
    """
    Safely delivers real-time notifications to connected WebSocket clients.
    Supports invocation from both async route handlers and synchronous threads.
    """
    try:
        # Check if running in an active event loop
        running_loop = None
        try:
            running_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        if running_loop and running_loop.is_running():
            running_loop.create_task(ws_manager.send_to_user(user_id, payload))
        elif ws_manager.loop and ws_manager.loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_manager.send_to_user(user_id, payload), ws_manager.loop)
        else:
            # Fallback: run in a new temporary event loop in background thread
            asyncio.run(ws_manager.send_to_user(user_id, payload))
    except Exception as e:
        logger.warning(f"Could not dispatch real-time WebSocket notification: {e}")
