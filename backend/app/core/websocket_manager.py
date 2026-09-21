from fastapi import WebSocket

# garde en mémoire tous les clients websocket connectés
class ConnectionManager: # pour pouvoir leur diffuser un message à tous en même temps

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict): # envoie le même message à tous les clients connectés

        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()