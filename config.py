import os

# Load .env file if present (development convenience)
try:
    from dotenv import load_dotenv
    _base = os.path.abspath(os.path.dirname(__file__))
    # Try both .env and credentials.env
    for _fname in (".env", "credentials.env"):
        _path = os.path.join(_base, _fname)
        if os.path.exists(_path):
            load_dotenv(_path, override=True)
            break
except ImportError:
    pass  # python-dotenv not installed — set env vars manually

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # ── Core ────────────────────────────────────────────────────────────────
    SECRET_KEY = os.environ.get("SECRET_KEY", "placement-secret-key")

    # ── Database ─────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'placement.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── File Uploads ─────────────────────────────────────────────────────────
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "resumes")
    EXPORT_FOLDER = os.path.join(BASE_DIR, "static", "exports")
    REPORT_FOLDER = os.path.join(BASE_DIR, "static", "reports")
    ALLOWED_EXTENSIONS = {"pdf", "doc", "docx"}

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ── Celery ───────────────────────────────────────────────────────────────
    CELERY_BROKER_URL = REDIS_URL       # used by celery_worker.py
    CELERY_RESULT_BACKEND = REDIS_URL   # used by celery_worker.py
    CELERY_TIMEZONE = "Asia/Kolkata"

    # ── Flask-Caching (Redis backend) ────────────────────────────────────────
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = REDIS_URL
    CACHE_DEFAULT_TIMEOUT = 300          # 5 minutes default

    # ── Flask-Mail (Gmail SMTP) ──────────────────────────────────────────────
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")   # set in env
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")   # set in env / app password
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER") or os.environ.get("MAIL_USERNAME") or "noreply@placement.com"

    # ── Admin seed credentials ───────────────────────────────────────────────
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "24f2000462@ds.study.iitm.ac.in")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
    ADMIN_NAME = os.environ.get("ADMIN_NAME", "Institute Admin")
