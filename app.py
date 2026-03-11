import os
from flask import Flask, render_template
from flask_login import LoginManager
from flask_mail import Mail
from flask_caching import Cache
from models import db, User, Student, Roles
from config import Config

from celery import Celery
from celery.schedules import crontab

celery = None   # module-level reference, set inside create_app()


def make_celery(app):
    global celery
    c = Celery(
        app.import_name,
        broker=app.config["CELERY_BROKER_URL"],
        backend=app.config["CELERY_RESULT_BACKEND"],
    )
    c.conf.update(
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        broker_url=app.config["CELERY_BROKER_URL"],
        timezone=app.config.get("CELERY_TIMEZONE", "Asia/Kolkata"),
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        beat_schedule={
            "daily-deadline-reminders": {
                "task": "tasks.reminders.send_deadline_reminders",
                "schedule": crontab(hour=8, minute=0),
            },
            "monthly-placement-report": {
                "task": "tasks.monthly_report.send_monthly_report",
                "schedule": crontab(day_of_month=1, hour=7, minute=0),
            },
        },
    )

    # ── Context task: pushes Flask app context before every task runs ────────
    class ContextTask(c.Task):
        abstract = True
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return super().__call__(*args, **kwargs)

    c.Task = ContextTask
    c.flask_app = app  # also store for direct access if needed

    # Register tasks
    from tasks.reminders import register_tasks as reg_reminders
    from tasks.monthly_report import register_tasks as reg_report
    from tasks.export import register_tasks as reg_export
    reg_reminders(c)
    reg_report(c)
    reg_export(c)

    # Store on app extensions so routes can access via current_app.extensions["celery"]
    app.extensions["celery"] = c
    celery = c
    return c

# ── Extension instances (initialised in create_app) ─────────────────────────
login_manager = LoginManager()
mail = Mail()
cache = Cache()


def create_app(config_class=Config):
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(config_class)

    # ── Create required directories ──────────────────────────────────────────
    for folder in [
        app.config["UPLOAD_FOLDER"],
        app.config["EXPORT_FOLDER"],
        app.config["REPORT_FOLDER"],
    ]:
        os.makedirs(folder, exist_ok=True)

    # ── Init extensions ──────────────────────────────────────────────────────
    db.init_app(app)
    mail.init_app(app)
    cache.init_app(app)

    login_manager.login_view = None          # API returns 401, not redirect
    login_manager.init_app(app)

    # ── User loader ──────────────────────────────────────────────────────────
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({"error": "Authentication required"}), 401

    # ── Register API blueprints ──────────────────────────────────────────────
    from api.auth import auth_bp
    from api.admin import admin_bp
    from api.company import company_bp
    from api.student import student_bp

    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(admin_bp,   url_prefix="/api/admin")
    app.register_blueprint(company_bp, url_prefix="/api/company")
    app.register_blueprint(student_bp, url_prefix="/api/student")

    # ── Single Jinja2 entry point — Vue mounts here ──────────────────────────
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def index(path):
        return render_template("index.html")

    # ── Mail connectivity check ──────────────────────────────────────────────
    with app.app_context():
        if app.config.get("MAIL_USERNAME") and app.config.get("MAIL_PASSWORD"):
            print(f"[MAIL] Configured — sending as {app.config['MAIL_USERNAME']}")
        else:
            print("[MAIL] WARNING — MAIL_USERNAME or MAIL_PASSWORD not set. Emails will fail.")

    # ── Celery ───────────────────────────────────────────────────────────────
    make_celery(app)

    # ── DB init + admin seed ─────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin(app)

    return app


def _seed_admin(app):
    """Create admin if not exists, or update email/password if config changed."""
    admin = User.query.filter_by(role=Roles.ADMIN).first()
    if admin:
        # Update email and password from config in case they changed
        changed = False
        if admin.email != app.config["ADMIN_EMAIL"]:
            admin.email = app.config["ADMIN_EMAIL"]
            changed = True
        if admin.passwd != app.config["ADMIN_PASSWORD"]:
            admin.passwd = app.config["ADMIN_PASSWORD"]
            changed = True
        if changed:
            db.session.commit()
            print(f"[SEED] Admin updated → {app.config['ADMIN_EMAIL']}")
        return

    admin_user = User(
        name=app.config["ADMIN_NAME"],
        email=app.config["ADMIN_EMAIL"],
        passwd=app.config["ADMIN_PASSWORD"],
        role=Roles.ADMIN,
        is_active=True,
    )
    db.session.add(admin_user)
    db.session.commit()
    print(f"[SEED] Admin created → {app.config['ADMIN_EMAIL']}")


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
