"""
Tests for report_service.build_report.
"""
import time
import pytest
from app.services import session_service, report_service
from app.models.workout import WorkoutSession


@pytest.fixture(autouse=True)
def clear_sessions():
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


class TestReportService:
    def _make_completed_session(
        self,
        exercise="squat",
        rep_count=10,
        correct=8,
        incorrect=2,
        form_scores=None,
    ) -> WorkoutSession:
        session = session_service.create_session(exercise, user_id="test_user")
        session.rep_count = rep_count
        session.correct_reps = correct
        session.incorrect_reps = incorrect
        # Use `is None` so an explicitly-passed [] is respected (not truthy-checked)
        session.form_scores = [80.0, 90.0, 85.0] if form_scores is None else form_scores
        session_service.end_session(session.session_id)
        return session

    def test_basic_report_fields(self):
        session = self._make_completed_session()
        report = report_service.build_report(session)
        assert report.total_reps == 10
        assert report.correct_reps == 8
        assert report.incorrect_reps == 2
        assert report.average_form_score == pytest.approx(85.0, abs=0.1)
        assert report.exercise == "squat"
        assert report.session_id == session.session_id

    def test_duration_positive(self):
        session = self._make_completed_session()
        report = report_service.build_report(session)
        assert report.duration_seconds >= 0

    def test_no_previous_sessions(self):
        session = self._make_completed_session()
        report = report_service.build_report(session)
        assert report.previous_reps == 0
        assert report.improvement_percentage == 0.0

    def test_improvement_percentage(self):
        # First session: 10 reps
        s1 = self._make_completed_session(rep_count=10)
        # Second session: 15 reps
        s2 = self._make_completed_session(rep_count=15)
        report = report_service.build_report(s2)
        assert report.previous_reps == 10
        assert report.improvement_percentage == pytest.approx(50.0, abs=0.1)

    def test_negative_improvement(self):
        s1 = self._make_completed_session(rep_count=20)
        s2 = self._make_completed_session(rep_count=15)
        report = report_service.build_report(s2)
        assert report.improvement_percentage == pytest.approx(-25.0, abs=0.1)

    def test_empty_form_scores(self):
        session = self._make_completed_session(form_scores=[])
        report = report_service.build_report(session)
        assert report.average_form_score == 0.0

    def test_report_to_dict_keys(self):
        session = self._make_completed_session()
        report = report_service.build_report(session)
        d = report.to_dict()
        expected_keys = {
            "sessionId", "exercise", "totalReps", "correctReps",
            "incorrectReps", "durationSeconds", "averageFormScore",
            "previousReps", "improvementPercentage",
        }
        assert expected_keys == set(d.keys())
