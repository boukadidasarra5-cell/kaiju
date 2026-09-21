from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings 
# HASH les mdp et (creer /verif) les TOKENS 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password) # hashe le mdp

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed) #compare le mdp hacher au mdp normale 
#si  le mdp correspond = true sinon false

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
#une fois le mdp verified on creer le token jwt