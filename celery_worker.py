# ── Entry point for the Celery CLI ───────────────────────────────────────────
# celery -A celery_worker worker --loglevel=info --pool=solo
# celery -A celery_worker beat   --loglevel=info
# pythom -m before it
from app import create_app

flask_app = create_app()

# make_celery() is called inside create_app() and stores the instance at
# flask_app.extensions["celery"] — retrieve it here for the CLI.
celery = flask_app.extensions["celery"]
