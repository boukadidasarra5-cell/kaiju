from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer # recup le token envoyé par client
from jose import jwt, JWTError
from app.core.config import settings #recupere setting de config
from app.core.exceptions import AppError
#lit le token envoyé par le client et retourne l'utulisateur courant (id , role , district)
#+ renvoie une error AppError si on trouve  pas de token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
#ligne d'avant sert a configurer la recup du token
def get_current_user(token: str | None = Depends(oauth2_scheme)):
    if token is None:
        raise AppError("UNAUTHENTICATED", "Missing authentication token", 401)

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return {
            "id": payload["sub"],
            "role": payload["role"],
            "district_id": payload.get("district_id"),
        }
    except JWTError:
        raise AppError("UNAUTHENTICATED", "Invalid or expired token", 401)