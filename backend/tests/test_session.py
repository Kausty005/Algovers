"""
Tests for session lifecycle via session_service.
"""
import pytest
from app.services import session_service


@pytest.fixture(autouse=True)
def clear_sessions():
    """Isolate each test by clearing the in-memory store."""
    from app.db import get_db
    session_service._sessions.clear()
    session_service._analyzers.clear()
    db = get_db()
    if db is not None:
        db.workouts.delete_many({"userId": "test_user"})
    yield
    session_service._sessions.clear()
    session_service._analyzers.clear()
    if db is not None:
        db.workouts.delete_many({"userId": "test_user"})


class TestSessionLifecycle:
    def test_create_session(self):
        session = session_service.create_session("squat", user_id="test_user")
        assert session.session_id
        assert session.exercise == "squat"
        assert session.status == "active"

    def test_get_session(self):
        session = session_service.create_session("bicep_curl", user_id="test_user")
        retrieved = session_service.get_session(session.session_id)
        assert retrieved is session

    def test_get_nonexistent_session(self):
        result = session_service.get_session("does-not-exist")
        assert result is None

    def test_end_session(self):
        session = session_service.create_session("push_up", user_id="test_user")
        ended = session_service.end_session(session.session_id)
        assert ended.status == "completed"
        assert ended.end_time is not None

    def test_end_nonexistent_session(self):
        result = session_service.end_session("ghost-id")
        assert result is None

    def test_analyzer_exists_after_create(self):
        session = session_service.create_session("squat", user_id="test_user")
        analyzer = session_service.get_analyzer_for_session(session.session_id)
        assert analyzer is not None

    def test_multiple_sessions_independent(self):
        s1 = session_service.create_session("squat", user_id="test_user")
        s2 = session_service.create_session("bicep_curl", user_id="test_user")
        assert s1.session_id != s2.session_id
        assert s1.exercise == "squat"
        assert s2.exercise == "bicep_curl"

    def test_invalid_exercise_raises(self):
        with pytest.raises(ValueError):
            session_service.create_session("flying_kick", user_id="test_user")

    def test_completed_sessions_listed(self):
        s1 = session_service.create_session("squat", user_id="test_user")
        session_service.end_session(s1.session_id)
        s2 = session_service.create_session("squat", user_id="test_user")   # still active
        completed = session_service.list_completed_sessions_for_exercise("squat", user_id="test_user")
        assert len(completed) == 1
        assert completed[0].session_id == s1.session_id
