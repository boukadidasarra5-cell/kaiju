# Tester l'API avec curl

Lancer le serveur (depuis `backend/`) :

```bash
uvicorn app.main:app --reload --port 8000
```

## 1. Créer un utilisateur

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123", "role": "QC", "district_id": 1}'
```

`role` : `QC`, `LC` ou `CD`. `district_id` requis si `QC`, sinon `null`.

## 2. Se connecter et récupérer un token

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'
```

Réponse :
```json
{"access_token": "eyJhbGciOi...", "token_type": "bearer"}
```

Copier la valeur d'`access_token`.

## 3. Appeler une route protégée

```bash
curl http://localhost:8000/districts/1/stock \
  -H "Authorization: Bearer <access_token>"
```

`district_id` va de 1 à 5 (1=Apex, 2=Echo, 3=Warden, 4=Xeno, 5=Zion selon l'ordre de seed).

## 4. Tester les cas d'erreur d'auth

Sans token :
```bash
curl http://localhost:8000/districts/1/stock
```
→ `401 UNAUTHENTICATED`

Avec un token invalide/expiré :
```bash
curl http://localhost:8000/districts/1/stock -H "Authorization: Bearer token_invalide"
```
→ `401 UNAUTHENTICATED`

Avec un username déjà pris (register) :
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123", "role": "QC", "district_id": 1}'
```
→ `400 VALIDATION_ERROR`

Sur une route restreinte à un rôle (`require_role`), avec un rôle non autorisé :
→ `403 PERMISSION_DENIED`

## 5. Créer un transfert (adjacence)

Transfert **direct** entre deux quartiers adjacents (A → E, valide) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 2, "route_type": "direct"}'
```
→ `201`, statut `pending`

Transfert **direct** entre deux quartiers non adjacents (E → W, invalide) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 2, "to_district_id": 3, "quantity": 2, "route_type": "direct"}'
```
→ `422 ADJACENCY_VIOLATION`

Transfert en **transit** (E → W via X, valide car X est adjacent aux deux) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 2, "to_district_id": 3, "transit_district_id": 4, "quantity": 2, "route_type": "transit"}'
```
→ `201`, statut `pending`

Transfert **maritime** entre deux quartiers avec accès à la mer (E → Z, valide) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 2, "to_district_id": 5, "quantity": 2, "route_type": "maritime"}'
```
→ `201`, statut `pending`

Transfert **maritime** avec un quartier enclavé (A → E, invalide car A n'a pas accès à la mer) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 2, "route_type": "maritime"}'
```
→ `422 ADJACENCY_VIOLATION`

(`district_id` : 1=Apex, 2=Echo, 3=Warden, 4=Xeno, 5=Zion selon l'ordre de seed, voir section 3)

## 6. Créer un transfert (rétention)

Communication equipment à Apex : initial=3, seuil min=1 (donc 2 unités disponibles au-dessus du minimum).

Transfert **valide** (1 unité, 3 → 2, au-dessus du minimum) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 6, "from_district_id": 1, "to_district_id": 2, "quantity": 1, "route_type": "direct"}'
```
→ `201`, statut `pending`

Transfert **invalide** (3 unités, ferait descendre à 0, sous le minimum de 1) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 6, "from_district_id": 1, "to_district_id": 2, "quantity": 3, "route_type": "direct"}'
```
→ `422 RETENTION_VIOLATION`

Transfert d'une quantité **supérieure au stock disponible** :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 6, "from_district_id": 1, "to_district_id": 2, "quantity": 100, "route_type": "direct"}'
```
→ `400 VALIDATION_ERROR`

## 7. Réquisition (CD uniquement, niveau 4+)

D'abord passer le niveau à 4 (avec un token CD) :
```bash
curl -X PATCH http://localhost:8000/disaster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_cd>" \
  -d '{"level": 4}'
```

Réquisition **valide** (mouvement immédiat, pas d'attente d'approbation) :
```bash
curl -X POST http://localhost:8000/transfers/requisition \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_cd>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 2}'
```
→ `201`, statut `completed` (pas `pending`)

Réquisition refusée, rôle non-CD :
```bash
curl -X POST http://localhost:8000/transfers/requisition \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 2}'
```
→ `403 PERMISSION_DENIED`

Réquisition refusée, niveau inférieur à 4 :
```bash
curl -X POST http://localhost:8000/transfers/requisition \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_cd>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 2}'
```
→ `422 DISASTER_LEVEL_FORBIDDEN`

## 8. Tester les WebSockets

Installer `websocat` (outil en ligne de commande pour se connecter à un WebSocket) :
```bash
sudo wget -qO /usr/local/bin/websocat https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl
sudo chmod +x /usr/local/bin/websocat
```

Ouvrir **deux terminaux séparés**, et dans chacun se connecter :
```bash
websocat ws://localhost:8000/ws
```
Les deux doivent rester connectés, en attente d'un message.

Dans un **troisième terminal**, déclencher un événement pour vérifier qu'il arrive bien dans les deux fenêtres en même temps.

**`stock_updated`** : déclenché par une réquisition (niveau 4+, token CD) :
```bash
curl -X POST http://localhost:8000/transfers/requisition \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_cd>" \
  -d '{"resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 1}'
```
-> les deux fenêtres `websocat` reçoivent :
```json
{"event": "stock_updated", "district_id": 1, "resource_id": 1, "new_quantity": ...}
```

**`disaster_level_changed`** : déclenché par un changement de niveau (token CD) :
```bash
curl -X PATCH http://localhost:8000/disaster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_cd>" \
  -d '{"level": 3}'
```
-> les deux fenêtres reçoivent :
```json
{"event": "disaster_level_changed", "level": 3}
```

**`transfer_conflict`** : déclenché quand deux transferts `pending` sur la même paire (district source, ressource) dépasseraient le seuil de rétention cumulés. Security units (resource_id=9) à Apex : initial=9, min=3, donc 6 unités disponibles.

Premier transfert, 4 unités (encore ok : 9-4=5, au-dessus de 3) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_qc>" \
  -d '{"resource_id": 9, "from_district_id": 1, "to_district_id": 2, "quantity": 4, "route_type": "direct"}'
```
-> `201 pending`, pas de conflit encore (un seul transfert en attente).

Deuxième transfert, 4 unités encore (cumulé : 4+4=8, donc 9-8=1, sous le seuil de 3 → conflit) :
```bash
curl -X POST http://localhost:8000/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_qc>" \
  -d '{"resource_id": 9, "from_district_id": 1, "to_district_id": 2, "quantity": 4, "route_type": "direct"}'
```
-> `201 pending` (le transfert est quand même créé), et les deux fenêtres `websocat` reçoivent en plus :
```json
{"event": "transfer_conflict", "resource_id": 9, "district_id": 1}
```

## Notes

- Le token expire après 8h (`access_token_expire_minutes` dans `config.py`), il faut se reconnecter pour en avoir un nouveau après.
- Sans header `Authorization`, la route renvoie `401 UNAUTHENTICATED`.
- Toutes les erreurs suivent le format `{"error_code": "...", "message": "...", "status": ...}` (voir `docs/api-contract.md`).