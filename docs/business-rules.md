# Kaiju | Règles métier

Ce document explique comment les règles du sujet sont implémentées dans le code, et pourquoi certains choix ont été faits.

## Seuil de rétention

### La règle (source : `kaiju-rules.pdf`, section "Retention threshold")

Chaque quartier doit garder au minimum 30% de son stock initial, à tout moment, par ressource. Le seul rôle qui peut abaisser ce seuil est le CD (City Director), qui peut le passer à 15%, uniquement en niveau de catastrophe 5.

### Le calcul

```
minimum = ceil(quantité_initiale × pourcentage / 100)
```

`ceil` arrondit **au-dessus**, jamais en-dessous, comme précisé par le sujet ("30% (rounded up)").

Exemple : Medical personnel à Apex (quantité initiale = 12) :
```
12 × 30 / 100 = 3.6 → arrondi à 4
```

### Pourquoi le pourcentage est un paramètre, pas une constante fixée à 30

Aujourd'hui, tous les quartiers ont `retention_threshold_pct = 30.0` (posé par `seed.py`). Mais le sujet prévoit que ce pourcentage puisse changer :

> "Only the City Director can lower this threshold (to 15%) in Level 5."

Le pourcentage est donc stocké **par ligne de stock** (colonne `retention_threshold_pct` sur `Stock`), pas codé en dur dans la fonction de calcul. Ça permet, quand la règle du CD sera implémentée, de faire un simple `UPDATE` sur cette colonne plutôt que de réécrire la logique de calcul.

```python
def retention_min(initial_qty: int, pct: float) -> int:
    return math.ceil(initial_qty * pct / 100)
```

La fonction ne connaît pas la valeur 30, elle reçoit le pourcentage en paramètre, lu depuis la base pour ce stock précis (`s.retention_threshold_pct`).

### Comment la règle est appliquée

Le sujet précise :

> "Resource allocation here means rejecting invalid operations under constraints, not computing an optimal distribution."

Concrètement : un stock ne doit **jamais** pouvoir descendre sous son minimum. Ce n'est pas une situation à détecter et corriger après coup, c'est une opération à **rejeter avant qu'elle n'ait lieu**.

Le stock ne change que via l'approbation d'un `TransferRequest` (le bootstrap précise "the inventory only changes when a transfer is approved"). Donc il n'existe qu'un seul point d'entrée où le stock diminue, et c'est à cet endroit précis que la vérification doit se faire :

1. Calculer ce que serait `current_quantity - quantity` après le transfert
2. Comparer au `retention_min()` du quartier source
3. Si le résultat serait inférieur au minimum → rejeter (`RETENTION_VIOLATION`, 422), rien n'est modifié en base
4. Sinon → autoriser

Tant que cette vérification est systématique sur ce seul point d'entrée, un stock ne peut jamais passer sous son seuil, peu importe le nombre de transferts demandés.

### Pas de consommation de ressources

Le sujet ne prévoit aucun mécanisme où une ressource serait "consommée" ou détruite sur place (par exemple : des équipes de secours utilisées en intervention et qui ne reviendraient pas). Ni `kaiju-project.pdf`, ni `kaiju-rules.pdf` n'en parlent, le seul mouvement de stock possible est le **transfert** entre quartiers, qui déplace une quantité d'un endroit à l'autre sans jamais la faire disparaître du total de la ville.

Le sujet le confirme indirectement : "resource allocation... respecting initial quantities" (`kaiju-project.pdf`, section Scope) suppose que les quantités totales restent une référence stable, pas un stock qui diminuerait avec le temps.

Un mécanisme de consommation serait donc une extension hors du scope actuel, à ne pas ajouter sans que ce soit explicitement demandé, le sujet insiste déjà sur le fait qu'il ne faut pas sur-complexifier ("If you find yourself reaching for an optimizer, you have misread the project" — `kaiju-bootstrap.pdf`).

## Matrice permissions × niveaux

### La règle (source : `kaiju-rules.pdf`, section "Permission matrix (levels × roles)")

| Action | Lv.1 | Lv.2 | Lv.3 | Lv.4 | Lv.5 |
|---|---|---|---|---|---|
| View resources | all | all | all | all | all |
| Reserve within own quarter | — | QC | QC | QC | QC |
| Request adjacent transfer | — | — | QC | QC, LC | all |
| Organize transit | — | — | — | LC | LC, CD |
| Requisition | — | — | — | CD | CD |
| Lower retention threshold | — | — | — | — | CD |

### Le niveau 5 ne donne pas tous les droits à tout le monde

Seule la ligne "Request adjacent transfer" devient `all` au niveau 5, n'importe quel rôle authentifié (QC, LC, CD) peut alors initier un transfert.

Les autres actions restent limitées même au niveau maximal :
- "Organize transit" reste réservé à LC et CD, un QC seul ne peut jamais organiser un transit, à aucun niveau.
- "Requisition" reste exclusivement CD, à tous les niveaux où elle est possible (4 et 5).
- "Lower retention threshold" reste exclusivement CD, uniquement au niveau 5.

Le CD garde donc des prérogatives que ni QC ni LC n'obtiennent jamais, même à l'escalade maximale. Ce que le niveau 5 change, c'est l'ouverture de la demande de transfert à tous, pas une levée générale des restrictions de rôle.

### Implémentation

La matrice est codée telle quelle dans `core/permissions.py` (`PERMISSION_MATRIX`), un dictionnaire `Action → {niveau → rôles autorisés}`. La fonction `can_perform(action, level, role)` fait la vérification en lisant directement cette structure. Aucune règle n'est déduite ou approximée, chaque cellule de la matrice du sujet a sa correspondance exacte dans le code.