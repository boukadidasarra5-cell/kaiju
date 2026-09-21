import logging
from fastapi import Request # requete HTTP envoyee par le client
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse # retourne une rep en format json
# definit le format d'erreur voir contrat d'API
logger = logging.getLogger("uvicorn.error")


class AppError(Exception):
    def __init__(self, error_code: str, message: str, status_code: int):
        self.error_code = error_code
        self.message = message
        self.status_code = status_code

async def app_error_handler(request: Request, exc: AppError):
    #quand une app erreur est declenchee je dois envoyé ca au client
    logger.warning("%s %s -> %s %s: %s", request.method, request.url.path, exc.status_code, exc.error_code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.error_code, "message": exc.message, "status": exc.status_code},
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Corps malformé (champ manquant/mal typé) : 400 VALIDATION_ERROR au lieu du 422 {"detail": [...]} par défaut (voir docs/api-contract.md)
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"] if part != "body")
    message = f"{field}: {first['msg']}" if field else first["msg"]
    return JSONResponse(
        status_code=400,
        content={"error_code": "VALIDATION_ERROR", "message": message, "status": 400},
    )
