# Kaiju | Récap du projet

## Pour lancer le projet

On démarre la base avec `docker-compose up -d`, puis on se place dans le dossier backend et on lance `uvicorn app.main:app --reload`. Ensuite tout se teste sur `http://127.0.0.1:8000/docs` ou avec curl.

## Les cinq quartiers

| Code | Nom | Accès mer | Particularité |
|---|---|---|---|
| A | Apex | non | enclavé, adjacent à E, W et X |
| E | Echo | oui | adjacent à A et X seulement, plus la mer |
| W | Warden | non | enclavé, adjacent à A, X et Z |
| X | Xeno | oui | hub central, adjacent à tous, plus la mer |
| Z | Zion | oui | adjacent à W et X seulement, plus la mer |

Une route directe suppose que les deux quartiers sont adjacents. Une route en transit passe par un troisième quartier qui doit être adjacent aux deux bouts. La route maritime ne marche qu'entre Echo, Xeno et Zion, et ignore complètement l'adjacence terrestre.

## Les trois rôles

| Rôle | Nom complet | Portée | district id |
|---|---|---|---|
| QC | Quarter Coordinator | un seul quartier | obligatoire |
| LC | Logistics Coordinator | plusieurs quartiers | null |
| CD | City Director | toute la ville | null |

## Les cinq niveaux de catastrophe

| Niveau | Nom | Ce qui devient possible |
|---|---|---|
| 1 | Watch | rien, juste de la consultation |
| 2 | Alert | réservation dans son propre quartier, pour un QC |
| 3 | Emergency | transfert entre quartiers adjacents, pour un QC |
| 4 | Critical | en plus, transit pour un LC et réquisition pour un CD |
| 5 | Catastrophic | tout est débloqué, et le CD peut baisser le seuil de rétention à 15% |

## Les dix ressources
 
| id | Nom |
|---|---|
| 1 | Medical personnel |
| 2 | Rescue teams |
| 3 | Transport vehicles |
| 4 | Emergency shelters |
| 5 | Food & water supplies |
| 6 | Communication equipment |
| 7 | Power generators |
| 8 | Engineering crews |
| 9 | Security units |
| 10 | Hazmat equipment |

Les id correspondent à l'ordre du seed . Pour consulter les id en base, `SELECT * FROM resources;` dans psql.

## Les fichiers, dossier par dossier

### app/core | la logique partagée entre plusieurs fichiers

- **config.py** lit le fichier .env et centralise les réglages (base de données, clé secrète JWT).
- **security.py** hash les mots de passe et crée ou vérifie les tokens JWT.
- **exceptions.py** définit le format d'erreur commun du contrat d'API.
- **deps.py** lit le token JWT envoyé par le client et retourne l'utilisateur connecté.
- **permissions.py** vérifie le rôle de l'utilisateur et contient la matrice des permissions par niveau.
- **adjacency.py** vérifie qu'un trajet, direct, en transit ou maritime, est géographiquement possible.
- **retention.py** vérifie qu'un transfert ne fait pas descendre un quartier sous son seuil minimum.

### app/models | les tables de la base, en SQLAlchemy

- **district.py** contient la table des cinq quartiers et celle des paires adjacentes.
- **resource.py** contient la table des dix types de ressources.
- **stock.py** contient la quantité d'une ressource dans un quartier, avec son seuil de rétention.
- **user.py** contient la table des comptes et les trois rôles possibles.
- **transfer.py** contient la table des demandes de transfert, avec statut et type de route.
- **disaster.py** contient une seule ligne, le niveau de catastrophe actuel.

### app/schemas | la validation des données, en Pydantic

- **user.py** définit ce que l'API accepte pour l'inscription et la connexion, et vérifie que district id est cohérent avec le rôle.
- **disaster.py** vérifie que le niveau envoyé est bien entre 1 et 5.
- **transfer.py** définit ce que l'API accepte pour créer un transfert.

### app/routers | les routes HTTP de l'API

- **auth.py** gère l'inscription, la connexion, et une route de test protégée par rôle.
- **disaster.py** permet de voir ou changer le niveau de catastrophe, réservé au CD.
- **transfers.py** permet de créer une demande de transfert, en vérifiant l'adjacence, le niveau et la rétention.
- **stocks.py** gère le CRUD des stocks par quartier.

### app/main.py

Le point d'entrée de l'application. Il branche tous les routers ensemble et enregistre le gestionnaire d'erreurs global.

## Le format d'erreur

Chaque erreur suit le même format partout :

```
{"error_code": "...", "message": "...", "status": ...}
```

| Code | Situation |
|---|---|
| UNAUTHENTICATED | token manquant ou invalide, 401 |
| PERMISSION_DENIED | mauvais rôle pour l'action, 403 |
| ADJACENCY_VIOLATION | quartiers non adjacents, pas de transit valide, 422 |
| RETENTION_VIOLATION | le transfert viderait le quartier sous le seuil, 422 |
| DISASTER_LEVEL_FORBIDDEN | action non permise à ce niveau pour ce rôle, 422 |
| NOT_FOUND | quartier, ressource ou stock introuvable, 404 |
| VALIDATION_ERROR | champ invalide, par exemple une quantité négative, 400 |
