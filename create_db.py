from app import  create_app
from models import db, User, Roles, Company, PlacementDrive, Application, Student

app = create_app()
app.app_context().push()
db.drop_all()
db.create_all()


existing_admin = User.query.filter_by(email="admin.com").first()
if not existing_admin:
    admin = User(name="Admin", email="admin.com",
                passwd ="admin123",
                role= Roles.ADMIN.value,
                is_active= True)    
    db.session.add(admin)
    db.session.commit()
    print("Admin account created successfully.")
    print("Admin Email: admin.com")
    print("Password: admin123")
else:
    print("Admin already exists")
