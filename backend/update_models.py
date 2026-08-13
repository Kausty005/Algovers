from app import create_app
from app.db import get_db

app = create_app()
with app.app_context():
    db = get_db()
    
    # Update all basic users
    db.users.update_many(
        {'ai_state.model_name': 'gemini-1.5-flash-8b'},
        {'$set': {'ai_state.model_name': 'gemini-flash-lite-latest'}}
    )
    
    # Update all pro users
    db.users.update_many(
        {'ai_state.model_name': 'gemini-1.5-flash'},
        {'$set': {'ai_state.model_name': 'gemini-flash-latest'}}
    )
    
    # Update all expert users
    db.users.update_many(
        {'ai_state.model_name': 'gemini-1.5-pro'},
        {'$set': {'ai_state.model_name': 'gemini-pro-latest'}}
    )
    
    print('Successfully updated legacy model names in database.')
