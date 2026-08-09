"""
Report service — calculates end-of-session workout reports.
"""
from __future__ import annotations

import time
from app.models.workout import WorkoutSession, WorkoutReport
from app.services import session_service


def build_report(session: WorkoutSession) -> WorkoutReport:
    """
    Build a WorkoutReport from a completed session.

    Improvement % is calculated vs. the most recent *previous* completed
    session for the same exercise.
    """
    duration = (session.end_time or time.time()) - session.start_time

    form_scores = session.form_scores
    avg_form = sum(form_scores) / len(form_scores) if form_scores else 0.0

    # Look up previous session (exclude current session)
    previous_sessions = [
        s for s in session_service.list_completed_sessions_for_exercise(session.exercise)
        if s.session_id != session.session_id
    ]
    previous_reps = 0
    if previous_sessions:
        # Most recent previous session
        last = max(previous_sessions, key=lambda s: s.start_time)
        previous_reps = last.rep_count

    if previous_reps > 0:
        improvement = ((session.rep_count - previous_reps) / previous_reps) * 100
    else:
        improvement = 0.0

    return WorkoutReport(
        session_id=session.session_id,
        exercise=session.exercise,
        total_reps=session.rep_count,
        correct_reps=session.correct_reps,
        incorrect_reps=session.incorrect_reps,
        duration_seconds=duration,
        average_form_score=avg_form,
        previous_reps=previous_reps,
        improvement_percentage=improvement,
    )
