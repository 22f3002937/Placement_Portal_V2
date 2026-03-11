import csv
import os
import traceback
from models import db, Student, Application, ExportTaskLog, NotificationLog, NotificationType


def register_tasks(celery):

    @celery.task(name="tasks.export.export_student_csv")
    def export_student_csv(student_id, task_log_id):
        from flask import current_app

        # Fresh session — discard any stale state from the worker process
        db.session.remove()

        print(f"[EXPORT] Starting — student_id={student_id}, task_log_id={task_log_id}")

        fname = None
        try:
            export_dir = current_app.config["EXPORT_FOLDER"]
            os.makedirs(export_dir, exist_ok=True)

            fname = f"export_student_{student_id}_{task_log_id}.csv"
            fpath = os.path.join(export_dir, fname)

            student = Student.query.get(student_id)
            if not student:
                raise ValueError(f"Student {student_id} not found")

            applications = Application.query.filter_by(student_id=student_id).all()
            print(f"[EXPORT] Writing {len(applications)} rows → {fpath}")

            with open(fpath, "w", newline="") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([
                    "Application ID", "Student ID", "Student Name",
                    "Company Name", "Drive Title",
                    "Application Status", "Applied On", "Last Updated",
                ])
                for a in applications:
                    writer.writerow([
                        a.id, student.id, student.name,
                        a.drive.company.company_name, a.drive.job_title,
                        a.status, str(a.applied_on), str(a.updated_at),
                    ])

            task_log = db.session.get(ExportTaskLog, task_log_id)
            if task_log:
                task_log.status = "done"
                task_log.file_path = fname
                db.session.commit()
                print(f"[EXPORT] DB updated — status=done, file_path={fname}")
            else:
                print(f"[EXPORT ERROR] ExportTaskLog id={task_log_id} not found")

        except Exception as e:
            print(f"[EXPORT ERROR] {e}")
            traceback.print_exc()
            db.session.rollback()
            try:
                task_log = db.session.get(ExportTaskLog, task_log_id)
                if task_log:
                    task_log.status = "failed"
                    db.session.commit()
            except Exception:
                pass
            return {"error": str(e)}

        # ── Email (isolated — never affects DB result above) ─────────────────
        if fname and student:
            notif_status = "failed"
            try:
                from app import mail
                from flask_mail import Message
                sender = current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")
                from flask import current_app
                print(f"[MAIL] Attempting to send to {student.user.email}")
                print(f"[MAIL] SMTP server: {current_app.config.get('MAIL_SERVER')}:{current_app.config.get('MAIL_PORT')}")
                print(f"[MAIL] Using account: {current_app.config.get('MAIL_USERNAME')}")
                mail.send(Message(
                    sender=sender,
                    subject="Your placement history export is ready",
                    recipients=[student.user.email],
                    body=(
                        f"Hi {student.name},\n\n"
                        f"Your export CSV is ready: {fname}\n\n"
                        f"Regards,\nPlacement Portal"
                    ),
                ))
                notif_status = "sent"
                print(f"[MAIL] ✓ Email sent successfully to {student.user.email}")
            except Exception as e:
                import traceback
                print(f"[MAIL ERROR] Failed to send email: {type(e).__name__}: {e}")
                traceback.print_exc()

            try:
                db.session.add(NotificationLog(
                    user_id=student.user_id,
                    message="Your application history CSV export is ready.",
                    notification_type=NotificationType.EXPORT_READY,
                    status=notif_status,
                ))
                db.session.commit()
            except Exception as e:
                print(f"[WARN] Notification log failed: {e}")

        return {"file": fname, "student_id": student_id}

    return export_student_csv
