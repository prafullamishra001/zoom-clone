from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from signaling import manager

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/signaling/{meeting_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str, user_id: str):
    """WebSocket endpoint for WebRTC signaling"""
    await manager.connect(websocket, meeting_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Route the message based on type
            message_type = data.get("type")
            
            if message_type == "offer":
                await manager.send_to_user(meeting_id, data.get("target_user_id"), data)
            elif message_type == "answer":
                await manager.send_to_user(meeting_id, data.get("target_user_id"), data)
            elif message_type == "ice_candidate":
                await manager.send_to_user(meeting_id, data.get("target_user_id"), data)
            elif message_type == "leave":
                manager.disconnect(meeting_id, user_id)
                await manager.broadcast_to_meeting(meeting_id, {
                    "type": "user_left",
                    "user_id": user_id
                })
                
    except WebSocketDisconnect:
        manager.disconnect(meeting_id, user_id)
        await manager.broadcast_to_meeting(meeting_id, {
            "type": "user_left",
            "user_id": user_id
        })
