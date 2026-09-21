from enum import Enum
from fastapi import Depends  # systeme de dependances fastAPI
from app.core.deps import get_current_user
from app.models.user import RoleEnum
from app.core.exceptions import AppError

# VERIFIE que l'utulisateur a le BON ROLE !!!
def require_role(*allowed_roles: RoleEnum):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in [r.value for r in allowed_roles]:
            raise AppError(
                "PERMISSION_DENIED",
                f"Role {user['role']} is not permitted to perform this action",
                403
            )
        return user
    return checker
# si c le bon role = acces sinon erreur 403

# Matrice des permissions par niveau de catastrophe 
class Action(str, Enum):
    VIEW_RESOURCES = "view_resources"
    RESERVE_OWN_QUARTER = "reserve_own_quarter"
    REQUEST_ADJACENT_TRANSFER = "request_adjacent_transfer"
    ORGANIZE_TRANSIT = "organize_transit"
    REQUISITION = "requisition"
    LOWER_RETENTION_THRESHOLD = "lower_retention_threshold"

# "all" = n'importe quel rôle authentifié. set() = personne à ce niveau.
PERMISSION_MATRIX = {
    Action.VIEW_RESOURCES:              {1: "all", 2: "all", 3: "all", 4: "all", 5: "all"},
    Action.RESERVE_OWN_QUARTER:         {1: set(), 2: {RoleEnum.QC}, 3: {RoleEnum.QC}, 4: {RoleEnum.QC}, 5: {RoleEnum.QC}},
    Action.REQUEST_ADJACENT_TRANSFER:   {1: set(), 2: set(), 3: {RoleEnum.QC}, 4: {RoleEnum.QC, RoleEnum.LC}, 5: "all"},
    Action.ORGANIZE_TRANSIT:            {1: set(), 2: set(), 3: set(), 4: {RoleEnum.LC}, 5: {RoleEnum.LC, RoleEnum.CD}},
    Action.REQUISITION:                 {1: set(), 2: set(), 3: set(), 4: {RoleEnum.CD}, 5: {RoleEnum.CD}},
    Action.LOWER_RETENTION_THRESHOLD:   {1: set(), 2: set(), 3: set(), 4: set(), 5: {RoleEnum.CD}},
}

def can_perform(action: Action, level: int, role: str) -> bool:
    allowed = PERMISSION_MATRIX[action][level]
    if allowed == "all":
        return True
    return RoleEnum(role) in allowed