from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: # ce canal sert à diffuser les stocks, conflits, niveaux aux clients
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)