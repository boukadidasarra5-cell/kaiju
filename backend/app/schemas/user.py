from pydantic import BaseModel, model_validator, field_validator
from app.models.user import RoleEnum
## ce que l'api accepte en entree et renvoie en sortie
# verifie si district_id est fourni seulement si role =QC

class UserCreate(BaseModel): ##inscription 
    username: str
    password: str
    role: RoleEnum
    district_id: int | None = None

    @field_validator("password") ##verifie que le mdp est assez solide
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after") ##verifie la coherence
    ## si role et district vont ensembles
    def check_district_consistency(self):
        if self.role == RoleEnum.QC and self.district_id is None:
            raise ValueError("QC role requires a district_id")
        if self.role != RoleEnum.QC and self.district_id is not None:
            raise ValueError("Only QC role can have a district_id")
        return self

class UserLogin(BaseModel): ## connexion
    username: str
    password: str

class Token(BaseModel): ## reponse apre cnx
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel): ## reponse utiisateur (apres creation compte)
    id: int
    username: str
    role: RoleEnum
    district_id: int | None

    class Config:
        from_attributes = True ##verif avec pydantic
        ## pydantic = biblio pyhton pr verifier et valider les donnees