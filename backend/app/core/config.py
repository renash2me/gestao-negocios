from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Negócio
    BUSINESS_NAME: str = "Gestão de Negócios"
    BUSINESS_LOGO_URL: str = ""

    # Banco
    DATABASE_URL: str

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas (dia de trabalho)

    # Taxas padrão (podem ser sobrescritas por maquininha)
    DEFAULT_CARD_FEE_PERCENT: float = 2.0

    # Energia
    DEFAULT_KWH_RATE: float = 0.75  # R$ por kWh


@lru_cache
def get_settings() -> Settings:
    return Settings()
