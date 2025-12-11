import os
from dotenv import load_dotenv

class ConfigService:
    _config = None

    @classmethod
    def load_config(cls):
        if cls._config is None:
            load_dotenv()
            # Load all environment variables into the config dict
            cls._config = dict(os.environ)
        return cls._config

    @classmethod
    def get(cls, key, default=None):
        config = cls.load_config()
        return config.get(key, default)
