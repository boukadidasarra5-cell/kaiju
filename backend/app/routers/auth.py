from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session #session de connexion avec la db
from app.db.session import get_db
from app.models.user import User, RoleEnum
from app.core.security import hash_password, verify_password, create_access_token
from app.core.permissions import require_role
from app.core.deps import get_current_user
from app.core.exceptions import AppError
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
 ## DEFINIE LA FORME DE DONNEES RECUES/ENVOYEES PAR L'API
# LES ROUTESRS : auth/register auth/login et route test protegee par role

router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/register", response_model=UserOut, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_in.username).first():
        raise AppError("VALIDATION_ERROR", "Username already registered", 400)
    user = User(
        username=user_in.username,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        district_id=user_in.district_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise AppError("UNAUTHENTICATED", "Invalid username or password", 401)
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "district_id": user.district_id,
    })
    return {"access_token": token, "token_type": "bearer"}

@router.get("/test-cd-only")
def test_cd_only(user=Depends(require_role(RoleEnum.CD))):
    return {"message": f"Welcome CD user {user['id']}"}

@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), current=Depends(get_current_user)):
    user = db.query(User).filter(User.id == int(current["id"])).first()
    if not user:
        raise AppError("UNAUTHENTICATED", "User no longer exists", 401)
    return user
