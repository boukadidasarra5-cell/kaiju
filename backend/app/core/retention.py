import math
from app.models.stock import Stock
from app.core.exceptions import AppError


def retention_min(initial_qty: int, pct: float) -> int: # Seuil minimum à conserver = quantité_initiale x pourcentage / 100, arrondi au-dessus (source : kaiju-rules.pdf "Retention threshold", "30% (rounded up)")

    return math.ceil(initial_qty * pct / 100)


def validate_retention(stock: Stock, quantity_to_remove: int): # Vérifie qu'après avoir retiré quantity_to_remove du stock, le quartier reste au-dessus (ou égal à) son seuil minimum

    if quantity_to_remove > stock.current_quantity:
        raise AppError(
            "VALIDATION_ERROR",
            f"Cannot transfer {quantity_to_remove} units, only {stock.current_quantity} available",
            400,
        )

    remaining = stock.current_quantity - quantity_to_remove
    minimum = retention_min(stock.initial_quantity, stock.retention_threshold_pct)

    if remaining < minimum:
        raise AppError(
            "RETENTION_VIOLATION",
            f"Transfer would drop stock to {remaining}, below the minimum retention of {minimum}",
            422,
        )