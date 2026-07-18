from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Dictionary to store active connections: {meeting_id: {user_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, meeting_id: str, user_id: str):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = {}
        self.active_connections[meeting_id][user_id] = websocket
        logger.info(f"User {user_id} connected to meeting {meeting_id}")
        
        # Notify other participants that a new user joined
        await self.broadcast_to_meeting(meeting_id, {
            "type": "user_joined",
            "user_id": user_id
        }, exclude_user_id=user_id)
    
    def disconnect(self, meeting_id: str, user_id: str):
        if meeting_id in self.active_connections and user_id in self.active_connections[meeting_id]:
            del self.active_connections[meeting_id][user_id]
            logger.info(f"User {user_id} disconnected from meeting {meeting_id}")
            
            # Clean up empty meetings
            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]
    
    async def send_to_user(self, meeting_id: str, user_id: str, message: dict):
        if meeting_id in self.active_connections and user_id in self.active_connections[meeting_id]:
            websocket = self.active_connections[meeting_id][user_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
    
    async def broadcast_to_meeting(self, meeting_id: str, message: dict, exclude_user_id: str = None):
        if meeting_id in self.active_connections:
            for user_id, websocket in self.active_connections[meeting_id].items():
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
    
    def get_participants(self, meeting_id: str) -> Set[str]:
        if meeting_id in self.active_connections:
            return set(self.active_connections[meeting_id].keys())
        return set()

manager = ConnectionManager()
