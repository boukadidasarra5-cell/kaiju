from pydantic_settings import BaseSettings #recup depuis env
# lit le .env tt ce qui est 5database url et secret key) 
# centralise tt les reglages dans settings
class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256" # algo signature du jwt pr creer et verifier le token
    access_token_expire_minutes: int = 60 * 8  # 480mn = 8h
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"  # origines frontend autorisées, séparées par des virgules

    class Config:
        env_file = ".env" # on lui indique ou chercher les variables

settings = Settings()