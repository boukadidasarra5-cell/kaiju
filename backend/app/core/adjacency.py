from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.district import District, DistrictAdjacency
from app.core.exceptions import AppError


def are_adjacent(db: Session, district_a: District, district_b: District) -> bool: # Vérifie si deux quartiers sont directement adjacents

    if district_a.id == district_b.id:
        return False

    exists = db.query(DistrictAdjacency).filter(
        or_( # La table stocke une paire non-orientée (A-E et E-A sont la même connexion), donc on cherche dans les deux sens avec un OR
            and_(
                DistrictAdjacency.district_a_id == district_a.id,
                DistrictAdjacency.district_b_id == district_b.id,
            ),
            and_(
                DistrictAdjacency.district_a_id == district_b.id,
                DistrictAdjacency.district_b_id == district_a.id,
            ),
        )
    ).first()

    return exists is not None


def has_maritime_access(district: District) -> bool: # La colonne has_maritime_access est déjà stockée sur District
    return district.has_maritime_access # Echo, Xeno et Zion ont accès à la mer, Apex et Warden sont enclavés


# on retrouve ça dans kaiju-rules.pdf : Adjacency priority rules
def validate_route( # Valide qu'un transfert est géographiquement possible, selon le type de route demandé
    db: Session,
    from_district: District,
    to_district: District,
    transit_district: District | None,
    route_type: str,
):

    if route_type == "direct": # Si les deux quartiers sont adjacents
        if not are_adjacent(db, from_district, to_district):
            raise AppError(
                "ADJACENCY_VIOLATION",
                f"{from_district.code} and {to_district.code} are not adjacent; use transit or maritime route",
                422,
            )

    elif route_type == "transit":
        # Un transfert en transit doit préciser explicitement le quartier intermédiaire -> qui doit être adjacent aux deux bouts (source et destination)
        if transit_district is None:
            raise AppError(
                "ADJACENCY_VIOLATION",
                "Transit route requires a transit_district_id",
                422,
            )
        # Le quartier de transit doit être adjacent à la source...
        if not are_adjacent(db, from_district, transit_district):
            raise AppError(
                "ADJACENCY_VIOLATION",
                f"{from_district.code} is not adjacent to transit district {transit_district.code}",
                422,
            )
        # ...et adjacent à la destination. Sinon il ne sert à rien
        # comme intermédiaire (ce ne serait pas un vrai chemin).
        if not are_adjacent(db, transit_district, to_district):
            raise AppError(
                "ADJACENCY_VIOLATION",
                f"Transit district {transit_district.code} is not adjacent to {to_district.code}",
                422,
            )

    elif route_type == "maritime":
        # La route maritime ignore complètement l'adjacence terrestre :
        # elle n'est possible qu'entre quartiers ayant accès à la mer,
        # peu importe leur position dans le graphe terrestre.
        if not (has_maritime_access(from_district) and has_maritime_access(to_district)):
            raise AppError(
                "ADJACENCY_VIOLATION",
                "Maritime route only available between Echo, Xeno and Zion",
                422,
            )

    else:
        # Sécurité : si route_type ne correspond à aucun des 3 cas
        # prévus, c'est une erreur de saisie côté client, pas une
        # règle métier violée : donc 400, pas 422.
        raise AppError(
            "VALIDATION_ERROR",
            f"Unknown route_type: {route_type}",
            400,
        )