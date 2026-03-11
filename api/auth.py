from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, Student, Company, Roles, CompanyApprovalStatus

auth_bp = Blueprint("auth", __name__)


def _user_payload(user):
    """Return a safe dict representation of a user for session responses."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
    }


# ── POST /api/auth/login ─────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user or user.passwd != password:
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated"}), 403

    # Block blacklisted students/companies at login
    if user.role == Roles.STUDENT:
        student = user.student_prof[0] if user.student_prof else None
        if student and student.is_blacklisted:
            return jsonify({"error": "Your account has been blacklisted"}), 403

    if user.role == Roles.COMPANY:
        company = user.company_prof[0] if user.company_prof else None
        if company and company.is_blacklisted:
            return jsonify({"error": "Your company has been blacklisted"}), 403

    login_user(user)
    return jsonify({"message": "Login successful", "user": _user_payload(user)}), 200


# ── POST /api/auth/logout ────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200


# ── POST /api/auth/register/student ─────────────────────────────────────────
@auth_bp.route("/register/student", methods=["POST"])
def register_student():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["name", "email", "password", "branch", "cgpa", "graduation_year"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"].strip()).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=data["name"].strip(),
        email=data["email"].strip(),
        passwd=data["password"],
        role=Roles.STUDENT,
    )
    db.session.add(user)
    db.session.flush()   # get user.id before commit

    student = Student(
        user_id=user.id,
        name=data["name"].strip(),
        branch=data["branch"].strip(),
        cgpa=float(data["cgpa"]),
        graduation_year=int(data["graduation_year"]),
    )
    db.session.add(student)
    db.session.commit()

    return jsonify({"message": "Student registered successfully"}), 201


# ── POST /api/auth/register/company ─────────────────────────────────────────
@auth_bp.route("/register/company", methods=["POST"])
def register_company():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["name", "email", "password", "hr_contact", "website"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"].strip()).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=data["name"].strip(),
        email=data["email"].strip(),
        passwd=data["password"],
        role=Roles.COMPANY,
    )
    db.session.add(user)
    db.session.flush()

    company = Company(
        user_id=user.id,
        company_name=data["name"].strip(),
        company_email=data["email"].strip(),
        hr_contact=data["hr_contact"].strip(),
        website=data["website"].strip(),
        approval_status=CompanyApprovalStatus.PENDING.value,
    )
    db.session.add(company)
    db.session.commit()

    return jsonify({"message": "Company registered. Awaiting admin approval."}), 201


# ── GET /api/auth/me ─────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    """Return the currently logged-in user's basic info."""
    return jsonify({"user": _user_payload(current_user)}), 200
