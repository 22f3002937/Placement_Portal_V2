from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import date, datetime
from enum import Enum

db= SQLAlchemy()

class DriveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    CLOSED = "closed"

class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    SELECTED = "selected"
    REJECTED = "rejected"

class CompanyApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Roles(str, Enum):
    ADMIN = "admin"
    COMPANY = "company"
    STUDENT = "student"

class NotificationType(str, Enum):
    DEADLINE_REMINDER = "deadline_reminder"
    MONTHLY_REPORT = "monthly_report"
    EXPORT_READY = "export_ready"


class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    role = db.Column(db.Enum(Roles), nullable=False)
    passwd = db.Column(db.String(256), nullable = False)
    email = db.Column(db.String(90), unique=True)
    is_active = db.Column(db.Boolean, default=True)

    company_prof = db.relationship('Company', back_populates="user")
    student_prof = db.relationship("Student", back_populates="user")
    notifications = db.relationship("NotificationLog", back_populates="user")


class Company(db.Model):
    __tablename__ = "companies"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True)
    company_email = db.Column(db.String(90), unique=True)
    company_name = db.Column(db.String(150))
    hr_contact = db.Column(db.String(100))
    website = db.Column(db.String(150))
    approval_status = db.Column(db.String(20), default=CompanyApprovalStatus.PENDING.value)
    is_blacklisted = db.Column(db.Boolean, default=False)

    user = db.relationship('User', back_populates="company_prof")
    drives = db.relationship('PlacementDrive', back_populates='company', cascade="all, delete-orphan")


class PlacementDrive(db.Model):
    __tablename__ = "placement_drives"
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'))
    job_title = db.Column(db.String(150))
    job_description = db.Column(db.Text)
    min_cgpa = db.Column(db.Float)
    eligible_branches = db.Column(db.Text)
    eligible_year = db.Column(db.Integer)
    application_deadline = db.Column(db.Date, index=True)
    status = db.Column(db.String(20), default=DriveStatus.PENDING.value, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('Company', back_populates='drives')
    applications = db.relationship("Application", back_populates="drive", cascade="all, delete-orphan")

    def get_eligible_branches(self):
        if self.eligible_branches:
            return [branch.strip() for branch in self.eligible_branches.split(",") ]
        return []
    
    def set_eligible_branches(self, branches):
        self.eligible_branches = ",".join(branches)
        

class Application(db.Model):
    __tablename__ = "applications"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drives.id'))
    applied_on = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default=ApplicationStatus.APPLIED.value, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow,onupdate=datetime.utcnow)
    interview_date = db.Column(db.Date, nullable=True)
    interview_time = db.Column(db.Time, nullable=True)
    interview_notes = db.Column(db.Text, nullable=True)

    student = db.relationship('Student', back_populates='applications')
    drive = db.relationship('PlacementDrive', back_populates="applications")

    __table_args__ = (
        db.UniqueConstraint('student_id', 'drive_id', name='uix_student_drive'),
    )

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    name= db.Column(db.String(100))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True)
    branch = db.Column(db.String(50))
    cgpa = db.Column(db.Float)
    graduation_year = db.Column(db.Integer)
    resume = db.Column(db.String(200))
    is_blacklisted = db.Column(db.Boolean, default=False)
    

    user = db.relationship('User', back_populates="student_prof")
    applications = db.relationship('Application', back_populates='student')
    export_tasks = db.relationship("ExportTaskLog", back_populates="student")

class NotificationLog(db.Model):
    __tablename__ = "notification_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    message = db.Column(db.Text)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20))
    notification_type = db.Column(db.Enum(NotificationType), nullable=False)

    user = db.relationship("User", back_populates="notifications")


class MonthlyReportLog(db.Model):
    __tablename__ = "monthly_reports"
    id = db.Column(db.Integer, primary_key=True)
    month = db.Column(db.String(20))
    generated_at = db.Column(db.DateTime, default= datetime.utcnow)
    file_path = db.Column(db.String(200))
    sent_status = db.Column(db.String(20))

class ExportTaskLog(db.Model):
    __tablename__ ="export_tasks"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"))
    task_id = db.Column(db.String(100))
    status = db.Column(db.String(20), default="pending")
    file_path = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", back_populates="export_tasks")




