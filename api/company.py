from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, User, Company, PlacementDrive, Application
from models import Roles, CompanyApprovalStatus, DriveStatus, ApplicationStatus
from datetime import datetime

company_bp = Blueprint("company", __name__)


def _get_company():
    """Return the Company record for the currently logged-in company user."""
    user = User.query.get(current_user.id)
    if not user or user.role != Roles.COMPANY:
        return None
    return Company.query.filter_by(user_id=user.id).first()


def _require_approved_company():
    """Return (company, error_response) tuple."""
    company = _get_company()
    if not company:
        return None, (jsonify({"error": "Access denied"}), 403)
    if company.approval_status != CompanyApprovalStatus.APPROVED.value:
        return None, (jsonify({"error": "Company not yet approved"}), 403)
    if company.is_blacklisted:
        return None, (jsonify({"error": "Company is blacklisted"}), 403)
    return company, None


# ── GET /api/company/dashboard ───────────────────────────────────────────────
@company_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    _key = f"company_dashboard_{current_user.id}"
    company, err = _require_approved_company()
    if err:
        return err

    drives_data = []
    for d in company.drives:
        drives_data.append({
            "id":                   d.id,
            "job_title":            d.job_title,
            "status":               d.status,
            "application_deadline": str(d.application_deadline),
            "applicant_count":      len(d.applications),
        })

    return jsonify({
        "company": {
            "id":           company.id,
            "name":         company.company_name,
            "email":        company.company_email,
            "hr_contact":   company.hr_contact,
            "website":      company.website,
        },
        "drives": drives_data,
    }), 200


# ── GET/PUT /api/company/profile ─────────────────────────────────────────────
@company_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    company = _get_company()
    if not company:
        return jsonify({"error": "Access denied"}), 403

    return jsonify({
        "id":              company.id,
        "name":            company.company_name,
        "email":           company.company_email,
        "hr_contact":      company.hr_contact,
        "website":         company.website,
        "approval_status": company.approval_status,
        "is_blacklisted":  company.is_blacklisted,
    }), 200


@company_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    company = _get_company()
    if not company:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    company.company_name = data.get("name", company.company_name).strip()
    company.hr_contact   = data.get("hr_contact", company.hr_contact).strip()
    company.website      = data.get("website", company.website)
    company.user.name    = company.company_name

    db.session.commit()
    return jsonify({"message": "Profile updated"}), 200


# ── POST /api/company/drives ─────────────────────────────────────────────────
@company_bp.route("/drives", methods=["POST"])
@login_required
def create_drive():
    company, err = _require_approved_company()
    if err:
        return err

    data = request.get_json()
    required = ["job_title", "job_description", "eligible_branches",
                "eligible_year", "min_cgpa", "application_deadline"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    drive = PlacementDrive(
        company_id=company.id,
        job_title=data["job_title"].strip(),
        job_description=data["job_description"].strip(),
        min_cgpa=float(data["min_cgpa"]),
        eligible_year=int(data["eligible_year"]),
        application_deadline=datetime.strptime(data["application_deadline"], "%Y-%m-%d").date(),
        status=DriveStatus.PENDING.value,
    )
    # eligible_branches can be a list from Vue or comma string
    branches = data["eligible_branches"]
    if isinstance(branches, list):
        drive.set_eligible_branches(branches)
    else:
        drive.eligible_branches = branches

    db.session.add(drive)
    db.session.commit()
    return jsonify({"message": "Drive created. Awaiting admin approval.", "drive_id": drive.id}), 201


# ── PATCH /api/company/drives/<id>/close ────────────────────────────────────
@company_bp.route("/drives/<int:drive_id>/close", methods=["PATCH"])
@login_required
def close_drive(drive_id):
    company, err = _require_approved_company()
    if err:
        return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return jsonify({"error": "Unauthorized"}), 403

    drive.status = DriveStatus.CLOSED.value
    db.session.commit()
    return jsonify({"message": "Drive closed"}), 200


# ── GET /api/company/drives/<id>/applications ────────────────────────────────
@company_bp.route("/drives/<int:drive_id>/applications", methods=["GET"])
@login_required
def view_applications(drive_id):
    company, err = _require_approved_company()
    if err:
        return err

    drive = PlacementDrive.query.get_or_404(drive_id)
    if drive.company_id != company.id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify([{
        "id":             a.id,
        "student_name":   a.student.name,
        "student_email":  a.student.user.email,
        "branch":         a.student.branch,
        "cgpa":           a.student.cgpa,
        "status":         a.status,
        "applied_on":     str(a.applied_on),
        "interview_date": str(a.interview_date) if a.interview_date else None,
        "interview_time": str(a.interview_time) if a.interview_time else None,
        "interview_notes": a.interview_notes,
    } for a in drive.applications]), 200


# ── PATCH /api/company/applications/<id> ────────────────────────────────────
@company_bp.route("/applications/<int:application_id>", methods=["PATCH"])
@login_required
def update_application(application_id):
    company, err = _require_approved_company()
    if err:
        return err

    application = Application.query.get_or_404(application_id)
    if application.drive.company_id != company.id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    # Update status
    new_status = data.get("status")
    if new_status and new_status in [s.value for s in ApplicationStatus]:
        application.status = new_status

    # Update interview schedule
    if data.get("interview_date"):
        application.interview_date = datetime.strptime(data["interview_date"], "%Y-%m-%d").date()
    if data.get("interview_time"):
        time_str = data["interview_time"]
        # Handle both "HH:MM" (from input) and "HH:MM:SS" (from str(time_obj))
        fmt = "%H:%M:%S" if time_str.count(":") == 2 else "%H:%M"
        application.interview_time = datetime.strptime(time_str, fmt).time()
    if "interview_notes" in data:
        application.interview_notes = data["interview_notes"]

    db.session.commit()
    return jsonify({"message": "Application updated"}), 200
