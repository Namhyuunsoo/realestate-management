
from app import create_app
import os

app = create_app()
with app.app_context():
    user_service = app.data_manager.user_service
    users = user_service.get_all_users(include_inactive=True)
    print("--- User List ---")
    for u in users:
        print(f"Email: {u.email}, Role: {u.role}, Status: {u.status}, Is Admin: {u.is_admin()}")
    
    print("\n--- ADMIN_USERS from Config ---")
    print(app.config.get("ADMIN_USERS", []))
