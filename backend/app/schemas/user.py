from pydantic import BaseModel, model_validator
from app.models.user import RoleEnum
## ce que l'api accepte en entree et renvoie en sortie
# verifie si district_id est fourni seulement si role =QC

class UserCreate(BaseModel): ##inscription 
    username: str
    password: str
    role: RoleEnum
    district_id: int | None = None

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