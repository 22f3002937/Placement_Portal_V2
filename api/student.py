from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db, User, Student, PlacementDrive, Application
from models import Roles, DriveStatus, ApplicationStatus
from datetime import datetime
import os

student_bp = Blueprint("student", __name__)


def _get_student():
    user = User.query.get(current_user.id)
    if not user or user.role != Roles.STUDENT:
        return None
    return Student.query.filter_by(user_id=user.id).first()


def _allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in current_app.config["ALLOWED_EXTENSIONS"]
    )


# ── GET /api/student/dashboard ───────────────────────────────────────────────
@student_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    _key = f"student_dashboard_{current_user.id}"
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    if student.is_blacklisted:
        return jsonify({"error": "Your account has been blacklisted"}), 403

    today = datetime.today().date()
    applied_drive_ids = {a.drive_id for a in student.applications}

    # Approved drives — optionally filtered by eligibility
    drives = PlacementDrive.query.filter_by(status=DriveStatus.APPROVED.value).all()
    drives_data = []
    for d in drives:
        branches = d.get_eligible_branches()
        eligible = (
            (not branches or student.branch in branches)
            and (not d.min_cgpa or student.cgpa >= d.min_cgpa)
            and (not d.eligible_year or student.graduation_year == d.eligible_year)
        )
        drives_data.append({
            "id":                   d.id,
            "job_title":            d.job_title,
            "company_name":         d.company.company_name,
            "eligible_branches":    branches,
            "min_cgpa":             d.min_cgpa,
            "eligible_year":        d.eligible_year,
            "application_deadline": str(d.application_deadline),
            "deadline_passed":      d.application_deadline < today,
            "already_applied":      d.id in applied_drive_ids,
            "is_eligible":          eligible,
        })

    applications_data = [{
        "id":             a.id,
        "job_title":      a.drive.job_title,
        "company_name":   a.drive.company.company_name,
        "status":         a.status,
        "applied_on":     str(a.applied_on),
        "interview_date": str(a.interview_date) if a.interview_date else None,
        "interview_time": str(a.interview_time) if a.interview_time else None,
    } for a in student.applications]

    return jsonify({
        "student": {
            "id":              student.id,
            "name":            student.name,
            "email":           student.user.email,
            "branch":          student.branch,
            "cgpa":            student.cgpa,
            "graduation_year": student.graduation_year,
            "resume":          student.resume,
        },
        "drives":       drives_data,
        "applications": applications_data,
    }), 200


# ── POST /api/student/apply/<drive_id> ───────────────────────────────────────
@student_bp.route("/apply/<int:drive_id>", methods=["POST"])
@login_required
def apply(drive_id):
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    if student.is_blacklisted:
        return jsonify({"error": "Your account has been blacklisted"}), 403

    drive = PlacementDrive.query.get_or_404(drive_id)
    today = datetime.today().date()

    if drive.status != DriveStatus.APPROVED.value:
        return jsonify({"error": "Drive is not open for applications"}), 400

    if drive.application_deadline and drive.application_deadline < today:
        return jsonify({"error": "Application deadline has passed"}), 400

    # Eligibility check
    branches = drive.get_eligible_branches()
    if branches and student.branch not in branches:
        return jsonify({"error": "You are not eligible (branch)"}), 403
    if drive.min_cgpa and student.cgpa < drive.min_cgpa:
        return jsonify({"error": f"You are not eligible (min CGPA: {drive.min_cgpa})"}), 403
    if drive.eligible_year and student.graduation_year != drive.eligible_year:
        return jsonify({"error": "You are not eligible (graduation year)"}), 403

    # Duplicate check
    if Application.query.filter_by(student_id=student.id, drive_id=drive.id).first():
        return jsonify({"error": "You have already applied for this drive"}), 409

    application = Application(
        student_id=student.id,
        drive_id=drive.id,
        status=ApplicationStatus.APPLIED.value,
    )
    db.session.add(application)
    db.session.commit()
    return jsonify({"message": "Application submitted successfully"}), 201


# ── GET /api/student/applications/<id> ──────────────────────────────────────
@student_bp.route("/applications/<int:application_id>", methods=["GET"])
@login_required
def view_application(application_id):
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    application = Application.query.get_or_404(application_id)
    if application.student_id != student.id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({
        "id":              application.id,
        "job_title":       application.drive.job_title,
        "job_description": application.drive.job_description,
        "company_name":    application.drive.company.company_name,
        "status":          application.status,
        "applied_on":      str(application.applied_on),
        "interview_date":  str(application.interview_date) if application.interview_date else None,
        "interview_time":  str(application.interview_time) if application.interview_time else None,
        "interview_notes": application.interview_notes,
    }), 200


# ── GET /api/student/history ─────────────────────────────────────────────────
@student_bp.route("/history", methods=["GET"])
@login_required
def history():
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    selected = Application.query.filter_by(
        student_id=student.id, status=ApplicationStatus.SELECTED.value
    ).all()

    return jsonify([{
        "id":           a.id,
        "job_title":    a.drive.job_title,
        "company_name": a.drive.company.company_name,
        "applied_on":   str(a.applied_on),
        "updated_at":   str(a.updated_at),
    } for a in selected]), 200


# ── GET/PUT /api/student/profile ─────────────────────────────────────────────
@student_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    return jsonify({
        "id":              student.id,
        "name":            student.name,
        "email":           student.user.email,
        "branch":          student.branch,
        "cgpa":            student.cgpa,
        "graduation_year": student.graduation_year,
        "resume":          student.resume,
    }), 200


@student_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    # Handle multipart (resume upload) or JSON (fields only)
    if request.content_type and "multipart" in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    student.name           = data.get("name", student.name).strip()
    student.user.name      = student.name
    student.branch         = data.get("branch", student.branch)
    student.cgpa           = float(data.get("cgpa", student.cgpa))
    student.graduation_year = int(data.get("graduation_year", student.graduation_year))

    # Resume upload
    file = request.files.get("resume")
    if file and _allowed_file(file.filename):
        filename = secure_filename(file.filename)
        fname = f"{student.id}_{filename}"
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], fname))
        student.resume = fname

    db.session.commit()
    return jsonify({"message": "Profile updated"}), 200


# ── POST /api/student/export ─────────────────────────────────────────────────
@student_bp.route("/export", methods=["POST"])
@login_required
def export_applications():
    student = _get_student()
    if not student:
        return jsonify({"error": "Access denied"}), 403

    from flask import current_app
    celery = current_app.extensions.get("celery")
    if celery is None:
        return jsonify({"error": "Celery not initialised on app"}), 503

    # Create log entry first so the task can update it by ID
    from models import ExportTaskLog
    task_log = ExportTaskLog(
        student_id=student.id,
        task_id="pending",
        status="pending",
    )
    db.session.add(task_log)
    db.session.commit()

    try:
        task = celery.send_task(
            "tasks.export.export_student_csv",
            args=[student.id, task_log.id]
        )
        # Store the real Celery task ID
        task_log.task_id = task.id
        db.session.commit()
    except Exception as e:
        task_log.status = "failed"
        db.session.commit()
        err = str(e)
        if "ConnectionError" in err or "OperationalError" in err or "10061" in err:
            return jsonify({"error": "Export service unavailable. Please ensure Redis and Celery worker are running."}), 503
        return jsonify({"error": f"Failed to start export task: {err}"}), 500

    return jsonify({
        "message": "Export started. You will be notified when ready.",
        "task_id":     task.id,
        "task_log_id": task_log.id,
    }), 202


# ── GET /api/student/export/status/<task_id> ─────────────────────────────────
@student_bp.route("/export/status/<task_id>", methods=["GET"])
@login_required
def export_status(task_id):
    from flask import current_app
    celery = current_app.extensions.get("celery")
    if celery is None:
        return jsonify({"error": "Celery not initialised"}), 503
    result = celery.AsyncResult(task_id)
    return jsonify({
        "task_id": task_id,
        "status":  result.status,
        "result":  result.result if result.status == "SUCCESS" else None,
    }), 200


# ── GET /api/student/exports ──────────────────────────────────────────────────
@student_bp.route("/exports", methods=["GET"])
@login_required
def list_exports():
    """Return all export jobs for the logged-in student."""
    from models import ExportTaskLog
    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify([]), 200

    logs = ExportTaskLog.query.filter_by(student_id=student.id)               .order_by(ExportTaskLog.created_at.desc()).all()

    return jsonify([{
        "id":         log.id,
        "status":     log.status,
        "file_path":  log.file_path,
        "created_at": str(log.created_at),
    } for log in logs]), 200


# ── GET /api/student/export/download/<task_log_id> ───────────────────────────
@student_bp.route("/export/download/<int:task_log_id>", methods=["GET"])
@login_required
def download_export(task_log_id):
    """Serve the CSV file for download — only to the owning student."""
    from flask import current_app, send_from_directory
    from models import ExportTaskLog

    student = Student.query.filter_by(user_id=current_user.id).first()
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    task_log = ExportTaskLog.query.get_or_404(task_log_id)

    if task_log.student_id != student.id:
        return jsonify({"error": "Unauthorized"}), 403

    if task_log.status != "done" or not task_log.file_path:
        return jsonify({"error": "Export not ready"}), 400

    export_dir = current_app.config["EXPORT_FOLDER"]
    return send_from_directory(
        export_dir,
        task_log.file_path,
        as_attachment=True,
        download_name=f"placement_history_{student.id}.csv",
    )
