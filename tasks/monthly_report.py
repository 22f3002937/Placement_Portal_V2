from datetime import datetime
import os
from models import (db, PlacementDrive, Application, MonthlyReportLog,
                    ApplicationStatus, NotificationLog, NotificationType, User, Roles)


def register_tasks(celery):

    @celery.task(name="tasks.monthly_report.send_monthly_report")
    def send_monthly_report():
        from flask import current_app
        from flask_mail import Message
        sender = current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")
        from app import mail

        now = datetime.utcnow()
        report_year  = now.year  if now.month > 1 else now.year - 1
        report_month = now.month - 1 if now.month > 1 else 12
        month_label  = f"{report_year}-{str(report_month).zfill(2)}"

        drives = PlacementDrive.query.filter(
            db.extract("year",  PlacementDrive.created_at) == report_year,
            db.extract("month", PlacementDrive.created_at) == report_month,
        ).all()

        drive_ids = [d.id for d in drives]
        total_applications = Application.query.filter(
            Application.drive_id.in_(drive_ids)).count() if drive_ids else 0
        total_selected = Application.query.filter(
            Application.drive_id.in_(drive_ids),
            Application.status == ApplicationStatus.SELECTED.value,
        ).count() if drive_ids else 0

        rows = "".join(
            f"<tr><td>{d.company.company_name}</td><td>{d.job_title}</td>"
            f"<td>{len(d.applications)}</td>"
            f"<td>{sum(1 for a in d.applications if a.status == ApplicationStatus.SELECTED.value)}</td></tr>"
            for d in drives
        )
        html = f"""<html><body style="font-family:sans-serif;padding:20px;">
        <h2>Monthly Placement Report — {month_label}</h2>
        <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
          <tr><th>Metric</th><th>Count</th></tr>
          <tr><td>Drives Conducted</td><td>{len(drives)}</td></tr>
          <tr><td>Total Applications</td><td>{total_applications}</td></tr>
          <tr><td>Students Selected</td><td>{total_selected}</td></tr>
        </table>
        <h3>Drive Breakdown</h3>
        <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
          <tr><th>Company</th><th>Job Title</th><th>Applicants</th><th>Selected</th></tr>
          {rows}
        </table>
        <p style="color:grey;font-size:12px;">Generated {now.strftime('%Y-%m-%d %H:%M')} UTC</p>
        </body></html>"""

        report_dir = current_app.config["REPORT_FOLDER"]
        os.makedirs(report_dir, exist_ok=True)
        fname = f"report_{month_label}.html"
        with open(os.path.join(report_dir, fname), "w") as f:
            f.write(html)

        admin = User.query.filter_by(role=Roles.ADMIN).first()
        sent_status = "failed"
        try:
            mail.send(Message(
                sender=sender,
                subject=f"Monthly Placement Report — {month_label}",
                recipients=[admin.email],
                html=html,
            ))
            sent_status = "sent"
        except Exception as e:
            print(f"[WARN] Monthly report email failed: {e}")

        db.session.add(MonthlyReportLog(month=month_label, file_path=fname, sent_status=sent_status))
        db.session.add(NotificationLog(
            user_id=admin.id,
            message=f"Monthly report for {month_label} generated.",
            notification_type=NotificationType.MONTHLY_REPORT,
            status=sent_status,
        ))
        db.session.commit()
        return {"month": month_label, "status": sent_status}

    return send_monthly_report
