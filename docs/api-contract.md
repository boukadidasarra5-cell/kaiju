# Kaiju | Contrat d'API

Ce document définit les endpoints, les formats de réponse et la structure des erreurs, à respecter des deux côtés avant de coder en parallèle.

## Format d'erreur commun

Toute opération rejetée renvoie ce format, jamais une erreur générique :

```json
{
  "error_code": "RETENTION_VIOLATION",
  "message": "Transfer would drop district below minimum retention threshold",
  "status": 422
}
```

### Codes HTTP utilisés dans l'API

| Code | Usage |
|---|---|
| 200 OK | Lecture réussie, approve/reject réussi |
| 201 Created | Création réussie (register, transfer request) |
| 400 Bad Request | Corps de requête malformé (champ manquant/mal typé) |
| 401 Unauthorized | Token absent, invalide ou expiré |
| 403 Forbidden | Rôle non autorisé pour l'action à ce niveau |
| 404 Not Found | District / resource / user / transfer id introuvable |
| 409 Conflict | Deux transferts simultanés visent le même stock limité |
| 422 Unprocessable Entity | Règle métier violée : adjacency, retention, niveau, transit |
| 500 Internal Server Error | Erreur serveur inattendue (fallback) |

### Codes HTTP par type de rejet

| Situation | Code HTTP | error_code exemple |
|---|---|---|
| Non authentifié | 401 | `UNAUTHENTICATED` |
| Rôle non autorisé pour l'action | 403 | `PERMISSION_DENIED` |
| Transfert entre quartiers non adjacents (sans transit) | 422 | `ADJACENCY_VIOLATION` |
| Transfert ferait passer un quartier sous le seuil de rétention | 422 | `RETENTION_VIOLATION` |
| Action non permise au niveau de catastrophe actuel | 422 | `DISASTER_LEVEL_FORBIDDEN` |
| Transit sans approbation du quartier intermédiaire | 422 | `TRANSIT_NOT_APPROVED` |
| Deux transferts simultanés sur le même stock (conflit) | 409 | `TRANSFER_CONFLICT` |
| Ressource / district / user / transfer introuvable | 404 | `NOT_FOUND` |
| Erreur de validation de champ (ex: quantité négative) | 400 | `VALIDATION_ERROR` |
| Erreur serveur inattendue | 500 | `INTERNAL_ERROR` |

## Authentification

### `POST /auth/register`
Body :
```json
{ "username": "string", "password": "string", "role": "QC|LC|CD", "district_id": 1 }
```
`district_id` obligatoire si `role: QC`, sinon `null`.

Réponse 201 :
```json
{ "id": 1, "username": "string", "role": "QC", "district_id": 1 }
```

### `POST /auth/login`
Body :
```json
{ "username": "string", "password": "string" }
```

Réponse 200 :
```json
{ "access_token": "string", "token_type": "bearer" }
```

### `GET /auth/me`
Renvoie l'utilisateur du token (le JWT ne contient pas le `username`).

Réponse 200 :
```json
{ "id": 1, "username": "string", "role": "QC", "district_id": 1 }
```

Toutes les routes suivantes nécessitent le header `Authorization: Bearer <token>`, sauf `GET /districts` (publique : données de référence nécessaires au formulaire d'inscription).

## Districts

### `GET /districts`
Liste les 5 quartiers.

Réponse 200 :
```json
[
  { "id": 1, "code": "A", "name": "Apex", "has_maritime_access": false }
]
```

### `GET /districts/:id/adjacency`
Liste les quartiers adjacents à celui-ci.

Réponse 200 :
```json
{ "district_id": 1, "adjacent_to": ["E", "W", "X"] }
```

## Resources & Stocks

### `GET /resources`
Liste les 10 types de ressources.

### `GET /districts/:id/stock`
Stock détaillé d'un quartier (toutes ressources).

Réponse 200 :
```json
[
  {
    "resource_id": 1,
    "resource_name": "Medical personnel",
    "current_quantity": 12,
    "initial_quantity": 12,
    "retention_min": 4
  }
]
```

## Transfers

### `POST /transfers`
Crée une demande de transfert. Rôle requis dépend du niveau de catastrophe (voir matrice permissions).

Body :
```json
{
  "resource_id": 1,
  "from_district_id": 1,
  "to_district_id": 2,
  "transit_district_id": null,
  "quantity": 3,
  "route_type": "direct"
}
```

Réponse 201 :
```json
{ "id": 5, "status": "pending", "created_at": "2026-09-15T10:00:00Z" }
```

Erreurs possibles : `ADJACENCY_VIOLATION`, `RETENTION_VIOLATION`, `DISASTER_LEVEL_FORBIDDEN`, `PERMISSION_DENIED`.

### `PATCH /transfers/:id/approve`
Rôle requis : QC du quartier source (ou LC/CD selon niveau).

Réponse 200 :
```json
{ "id": 5, "status": "approved" }
```

### `PATCH /transfers/:id/reject`
Réponse 200 :
```json
{ "id": 5, "status": "rejected" }
```

### `GET /transfers?status=pending`
Liste les demandes de transfert (plus récentes d'abord), filtrable par statut (`pending`, `approved`, `rejected`, `completed`).

Réponse 200 :
```json
[
  {
    "id": 5, "resource_id": 1, "from_district_id": 1, "to_district_id": 2,
    "transit_district_id": null, "quantity": 3, "route_type": "direct",
    "status": "pending", "requested_by_id": 1, "disaster_level_at_request": 3,
    "created_at": "2026-09-15T10:00:00"
  }
]
```

Approve / reject : réservés au QC du quartier source ou au CD (un LC ne peut pas forcer un transfert). Un transfert déjà traité renvoie 422. L'approbation revalide la rétention, déplace le stock et émet `stock_updated` pour les deux quartiers.

## Disaster level (par quartier)

Chaque quartier a son propre niveau de catastrophe (1 à 5). Un transfert ou une réquisition est autorisé selon le niveau du **quartier source**. `GET /districts` renvoie aussi `disaster_level`.

### `GET /disaster`
Réponse 200 :
```json
[ { "district_id": 1, "level": 3, "updated_at": "2026-09-15T10:00:00" } ]
```

### `PATCH /districts/:id/disaster`
Rôle requis : CD uniquement.

Body :
```json
{ "level": 5, "retention_threshold_pct": 15 }
```
`retention_threshold_pct` est optionnel : il n'est accepté qu'au niveau 5 et ne s'applique qu'aux stocks de ce quartier (sinon `422 DISASTER_LEVEL_FORBIDDEN`).

Réponse 200 :
```json
{ "district_id": 1, "level": 5, "updated_at": "2026-09-15T10:05:00" }
```

Déclenche l'événement WebSocket `disaster_level_changed` à tous les clients connectés.

## WebSocket

Endpoint : `ws://.../ws`

### Événements émis par le serveur

```json
{ "event": "stock_updated", "district_id": 2, "resource_id": 1, "new_quantity": 4 }
```

```json
{ "event": "transfer_conflict", "resource_id": 1, "district_id": 2 }
```

```json
{ "event": "disaster_level_changed", "district_id": 1, "level": 3 }
```