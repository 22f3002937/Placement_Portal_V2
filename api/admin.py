from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, User, Student, Company, PlacementDrive, Application
from models import Roles, CompanyApprovalStatus, DriveStatus, ApplicationStatus
admin_bp = Blueprint("admin", __name__)


def _require_admin():
    user = User.query.get(current_user.id)
    return user and user.role == Roles.ADMIN


# ── GET /api/admin/dashboard ─────────────────────────────────────────────────
@admin_bp.route("/dashboard", methods=["GET"])
@login_required
def dashboard():
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403
    response = jsonify({
        "total_students":     Student.query.count(),
        "total_companies":    Company.query.filter_by(
                                  approval_status=CompanyApprovalStatus.APPROVED.value).count(),
        "total_drives":       PlacementDrive.query.count(),
        "total_applications": Application.query.count(),
    })
    return response, 200


# ── GET /api/admin/companies ─────────────────────────────────────────────────
@admin_bp.route("/companies", methods=["GET"])
@login_required
def get_companies():
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    companies = Company.query.all()
    response = jsonify([{
        "id":              c.id,
        "company_name":    c.company_name,
        "company_email":   c.company_email,
        "hr_contact":      c.hr_contact,
        "website":         c.website,
        "approval_status": c.approval_status,
        "is_blacklisted":  c.is_blacklisted,
    } for c in companies])
    return response, 200


# ── PATCH /api/admin/companies/<id>/status ───────────────────────────────────
@admin_bp.route("/companies/<int:company_id>/status", methods=["PATCH"])
@login_required
def update_company_status(company_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    action = data.get("action")  # "approve" | "reject"
    company = Company.query.get_or_404(company_id)

    if action == "approve":
        company.approval_status = CompanyApprovalStatus.APPROVED.value
    elif action == "reject":
        company.approval_status = CompanyApprovalStatus.REJECTED.value
    else:
        return jsonify({"error": "Invalid action"}), 400

    db.session.commit()
    return jsonify({"message": f"Company {action}d"}), 200


# ── PATCH /api/admin/companies/<id>/blacklist ────────────────────────────────
@admin_bp.route("/companies/<int:company_id>/blacklist", methods=["PATCH"])
@login_required
def toggle_blacklist_company(company_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    company = Company.query.get_or_404(company_id)
    company.is_blacklisted = not company.is_blacklisted
    db.session.commit()
    state = "blacklisted" if company.is_blacklisted else "removed from blacklist"
    return jsonify({"message": f"{company.company_name} {state}"}), 200


# ── PUT /api/admin/companies/<id> ────────────────────────────────────────────
@admin_bp.route("/companies/<int:company_id>", methods=["PUT"])
@login_required
def edit_company(company_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    company = Company.query.get_or_404(company_id)
    data = request.get_json()

    company.company_name = data.get("name", company.company_name).strip()
    company.hr_contact   = data.get("hr_contact", company.hr_contact).strip()
    company.website      = data.get("website", company.website)
    company.user.name    = company.company_name

    db.session.commit()
    return jsonify({"message": "Company updated"}), 200


# ── GET /api/admin/students ──────────────────────────────────────────────────
@admin_bp.route("/students", methods=["GET"])
@login_required
def get_students():
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.all()
    return jsonify([{
        "id":              s.id,
        "name":            s.name,
        "email":           s.user.email,
        "branch":          s.branch,
        "cgpa":            s.cgpa,
        "graduation_year": s.graduation_year,
        "is_active":       s.user.is_active,
        "is_blacklisted":  s.is_blacklisted,
    } for s in students]), 200


# ── PATCH /api/admin/students/<id>/deactivate ────────────────────────────────
@admin_bp.route("/students/<int:student_id>/deactivate", methods=["PATCH"])
@login_required
def toggle_deactivate_student(student_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    student = Student.query.get_or_404(student_id)
    student.user.is_active = not student.user.is_active
    db.session.commit()
    state = "activated" if student.user.is_active else "deactivated"
    return jsonify({"message": f"Student account {state}"}), 200


# ── PATCH /api/admin/students/<id>/blacklist ─────────────────────────────────
@admin_bp.route("/students/<int:student_id>/blacklist", methods=["PATCH"])
@login_required
def toggle_blacklist_student(student_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    student = Student.query.get_or_404(student_id)
    student.is_blacklisted = not student.is_blacklisted
    db.session.commit()
    state = "blacklisted" if student.is_blacklisted else "removed from blacklist"
    return jsonify({"message": f"Student {state}"}), 200


# ── PUT /api/admin/students/<id> ─────────────────────────────────────────────
@admin_bp.route("/students/<int:student_id>", methods=["PUT"])
@login_required
def edit_student(student_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    student = Student.query.get_or_404(student_id)
    data = request.get_json()

    student.user.name      = data.get("name", student.name).strip()
    student.name           = student.user.name
    student.branch         = data.get("branch", student.branch)
    student.cgpa           = float(data.get("cgpa", student.cgpa))
    student.graduation_year = int(data.get("graduation_year", student.graduation_year))

    db.session.commit()
    return jsonify({"message": "Student updated"}), 200


# ── DELETE /api/admin/students/<id> ─────────────────────────────────────────
@admin_bp.route("/students/<int:student_id>", methods=["DELETE"])
@login_required
def delete_student(student_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    student = Student.query.get_or_404(student_id)
    user = student.user
    try:
        db.session.delete(student)
        if user:
            db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "Student deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete student"}), 500


# ── GET /api/admin/drives ────────────────────────────────────────────────────
@admin_bp.route("/drives", methods=["GET"])
@login_required
def get_drives():
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    try:
        drives = PlacementDrive.query.all()
        result = []
        for d in drives:
            try:
                status_val = d.status.value if hasattr(d.status, "value") else d.status
                result.append({
                    "id":                   d.id,
                    "job_title":            d.job_title,
                    "company_name":         d.company.company_name if d.company else "Unknown",
                    "status":               status_val,
                    "application_deadline": str(d.application_deadline) if d.application_deadline else None,
                    "min_cgpa":             d.min_cgpa,
                    "eligible_branches":    d.get_eligible_branches(),
                    "eligible_year":        d.eligible_year,
                })
            except Exception as e:
                print(f"[WARN] Skipping drive {d.id}: {e}")
        response = jsonify(result)
        return response, 200
    except Exception as e:
        print(f"[ERROR] get_drives failed: {e}")
        return jsonify({"error": str(e)}), 500


# ── PATCH /api/admin/drives/<id>/status ─────────────────────────────────────
@admin_bp.route("/drives/<int:drive_id>/status", methods=["PATCH"])
@login_required
def update_drive_status(drive_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    action = data.get("action")  # "approve" | "reject"
    drive = PlacementDrive.query.get_or_404(drive_id)

    if action == "approve":
        drive.status = DriveStatus.APPROVED.value
    elif action == "reject":
        drive.status = DriveStatus.CLOSED.value
    else:
        return jsonify({"error": "Invalid action"}), 400

    db.session.commit()
    return jsonify({"message": f"Drive {action}d"}), 200


# ── GET /api/admin/drives/<id>/applications ──────────────────────────────────
@admin_bp.route("/drives/<int:drive_id>/applications", methods=["GET"])
@login_required
def view_drive_applications(drive_id):
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    drive = PlacementDrive.query.get_or_404(drive_id)
    result = []
    for a in drive.applications:
        try:
            result.append({
                "id":             a.id,
                "student_name":   a.student.name if a.student else "Unknown",
                "student_branch": a.student.branch if a.student else "—",
                "student_cgpa":   a.student.cgpa if a.student else None,
                "status":         a.status,
                "applied_on":     str(a.applied_on),
                "interview_date": str(a.interview_date) if a.interview_date else None,
                "interview_time": str(a.interview_time) if a.interview_time else None,
            })
        except Exception as e:
            print(f"[WARN] Skipping application {a.id}: {e}")
    return jsonify(result), 200


# ── GET /api/admin/search ────────────────────────────────────────────────────
@admin_bp.route("/search", methods=["GET"])
@login_required
def search():
    if not _require_admin():
        return jsonify({"error": "Access denied"}), 403

    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"students": [], "companies": []}), 200

    if query.isdigit():
        students  = Student.query.filter_by(id=int(query)).all()
        companies = Company.query.filter_by(id=int(query)).all()
    else:
        students = Student.query.join(User).filter(
            User.name.ilike(f"%{query}%") | User.email.ilike(f"%{query}%")
        ).all()
        companies = Company.query.join(User).filter(
            User.name.ilike(f"%{query}%") | User.email.ilike(f"%{query}%")
        ).all()

    return jsonify({
        "students": [{"id": s.id, "name": s.name, "email": s.user.email,
                      "branch": s.branch, "cgpa": s.cgpa} for s in students],
        "companies": [{"id": c.id, "name": c.company_name, "email": c.company_email,
                       "status": c.approval_status} for c in companies],
    }), 200
