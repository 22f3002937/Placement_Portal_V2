# ── Entry point for the Celery CLI ──────────────────────────────────────────
# celery -A celery_worker worker --loglevel=info --pool=solo
# celery -A celery_worker beat   --loglevel=info
# pythom -m before it
from app import create_app

flask_app = create_app()


celery = flask_app.extensions["celery"]
