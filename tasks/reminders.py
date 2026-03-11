from datetime import datetime, timedelta
from models import db, Student, PlacementDrive, NotificationLog, NotificationType, DriveStatus


def register_tasks(celery):

    @celery.task(name="tasks.reminders.send_deadline_reminders")
    def send_deadline_reminders():
        from flask import current_app
        from flask_mail import Message
        sender = current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")
        from app import mail

        today = datetime.today().date()
        upcoming = today + timedelta(days=3)

        drives = PlacementDrive.query.filter(
            PlacementDrive.status == DriveStatus.APPROVED.value,
            PlacementDrive.application_deadline == upcoming,
        ).all()

        sent, failed = 0, 0
        for drive in drives:
            applied_ids = {a.student_id for a in drive.applications}
            branches = drive.get_eligible_branches()
            students = Student.query.filter(
                Student.is_blacklisted == False,
                Student.cgpa >= (drive.min_cgpa or 0),
            ).all()

            for student in students:
                if student.id in applied_ids:
                    continue
                if branches and student.branch not in branches:
                    continue
                if drive.eligible_year and student.graduation_year != drive.eligible_year:
                    continue
                try:
                    msg = Message(
                        sender=sender,
                        subject=f"Reminder: {drive.job_title} deadline in 3 days",
                        recipients=[student.user.email],
                        body=(
                            f"Hi {student.name},\n\n"
                            f"The application deadline for '{drive.job_title}' at "
                            f"{drive.company.company_name} is on {drive.application_deadline}.\n"
                            f"Don't miss out — apply now on the Placement Portal.\n\n"
                            f"Regards,\nPlacement Cell"
                        ),
                    )
                    mail.send(msg)
                    status = "sent"
                    sent += 1
                except Exception:
                    status = "failed"
                    failed += 1

                db.session.add(NotificationLog(
                    user_id=student.user_id,
                    message=f"Deadline reminder for drive '{drive.job_title}'",
                    notification_type=NotificationType.DEADLINE_REMINDER,
                    status=status,
                ))

        db.session.commit()
        return {"sent": sent, "failed": failed}

    return send_deadline_reminders
