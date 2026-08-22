"""
4-level mission progression tests.

Verifies:
  - Levels 1-4 initialize with distinct problem sets, titles, and difficulty.
  - EVERY level is immediately unlocked and playable (no 403, no gating).
  - Level / difficulty / game_mode are stored on sessions, interactions, and XLSX.
  - Every level is winnable by solving ~5-7 problems correctly.
  - Solo and team progression are tracked independently (informational only).

Run: python test_progression_levels.py
"""
import sys
import os
import tempfile
from io import BytesIO

sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from openpyxl import load_workbook

import main
from models import Database
from simulation import LEVELS


def fresh_client():
    main.db = Database(os.path.join(tempfile.mkdtemp(), "test_neural_shield.db"))
    main.simulation = main.get_simulation()
    client = TestClient(main.app)
    return client


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


# Best correct solution per problem (used to drive the win path).
CORRECT = {
    "Dirty Data": "clean_dataset",
    "Missing Values": "normalize_data",
    "Noise": "remove_noise",
    "Class Imbalance": "balance_dataset",
    "Data Drift": "collect_more_data",
    "Bias": "tune_hyperparameters",
    "Concept Drift": "validate_model",
    "Overfitting": "regularize_model",
    "Underfitting": "enhance_features",
    "Feature Overload": "feature_selection",
    "Adversarial Noise": "harden_model",
    "Edge Cases": "stress_test_model",
    "Silent Data Corruption": "data_audit",
    "Model Drift in Production": "monitor_model",
    "Deployment Risk": "staged_rollout",
    "Feedback Loop": "retrain_model",
}


def start_session(client, tag, level=1, participant_id=None, game_mode='solo'):
    resp = client.post("/start-session", json={
        "participant_id": participant_id,
        "game_mode": game_mode,
        "level": level,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["session_id"], data["state"]


def win_level(client, session_id, state):
    """Solve every problem correctly until the game ends. Returns (state, solves)."""
    solves = 0
    for problem in state["problems"]:
        if state["game_status"] != "playing":
            break
        action = CORRECT[problem["id"]]
        client.post("/select-problem", json={"session_id": session_id, "problem_id": problem["id"]})
        resp = client.post("/apply-solution", json={
            "session_id": session_id, "action_type": action, "target_event": problem["id"],
        })
        assert resp.status_code == 200, resp.text
        state = resp.json()["state"]
        solves += 1
    return state, solves


def test_1_level_metadata_and_distinct_problem_sets():
    client = fresh_client()
    for cfg in LEVELS:
        # Every level starts directly for a fresh participant (no seeding needed).
        participant = f"meta-player-l{cfg['level']}"
        session_id, state = start_session(client, f"meta-l{cfg['level']}", level=cfg["level"], participant_id=participant)
        assert_eq(state["mission_level"], cfg["level"], "mission_level mismatch")
        assert_eq(state["mission_title"], cfg["title"], "mission_title mismatch")
        assert_eq(state["mission_subtitle"], cfg["subtitle"], "mission_subtitle mismatch")
        assert_eq(state["difficulty"], cfg["difficulty"], "difficulty mismatch")
        assert_eq(len(state["problems"]), 7, "Every level exposes exactly 7 problems")
        assert_eq({p["id"] for p in state["problems"]}, set(cfg["problems"]),
                  "Level problem set mismatch")
        assert all(p["state"] == "UNRESOLVED" for p in state["problems"])
        # Every exposed solution card must be usable somewhere in this level.
        active_ids = {p["id"] for p in state["problems"]}
        assert all(any(t in active_ids for t in s["valid_targets"]) for s in state["solutions"]), \
            f"Level {cfg['level']}: solution card with no valid target in level"
    print("PASS 1: Levels 1-4 expose correct metadata, distinct problem sets, usable cards")


def test_2_all_levels_immediately_available():
    client = fresh_client()
    participant = "open-player-2"
    # A brand-new participant can start every level with no gating.
    for cfg in LEVELS:
        resp = client.post("/start-session", json={
            "participant_id": participant, "game_mode": "solo", "level": cfg["level"],
        })
        assert resp.status_code == 200, f"Level {cfg['level']} should start immediately (got {resp.status_code}): {resp.text}"
        state = resp.json()["state"]
        assert state["mission_level"] == cfg["level"], f"Level {cfg['level']} should report the right mission"

    # Progress reports every level as playable (never 'locked').
    progress = client.get(f"/progress?participant_id={participant}&mode=solo").json()["levels"]
    assert_eq(len(progress), 4, "Four levels should be reported")
    for p in progress:
        assert p["status"] != "locked", f"Level {p['level']} must never report 'locked'"
    print("PASS 2: All 4 levels start immediately for any participant; progress never reports locked")


def test_3_progression_is_informational_only():
    client = fresh_client()
    participant = "prog-player-3"
    # Level 4 can be played before levels 2-3 are ever attempted.
    session_id, state = start_session(client, "l4-first", level=4, participant_id=participant)
    assert_eq(state["mission_level"], 4, "Level 4 should start directly")
    state, solves = win_level(client, session_id, state)
    assert_eq(state["game_status"], "won", "Perfect play on level 4 must win")
    client.post("/finish-session", json={"session_id": session_id, "result": state["outcome"]})

    progress = client.get(f"/progress?participant_id={participant}&mode=solo").json()["levels"]
    statuses = {p["level"]: p["status"] for p in progress}
    assert_eq(statuses[4], "completed", "Level 4 should be recorded as completed after a win")
    for level in (1, 2, 3):
        assert statuses[level] != "locked", f"Level {level} must never report 'locked'"
        # Every level is still immediately startable regardless of completion.
        resp = client.post("/start-session", json={
            "participant_id": participant, "game_mode": "solo", "level": level,
        })
        assert resp.status_code == 200, f"Level {level} must start after playing level 4: {resp.text}"
    print(f"PASS 3: Progression is informational only (level 4 won in {solves} solves, no gating)")


def test_4_solo_and_team_progression_kept_separate():
    client = fresh_client()
    participant = "multi-mode-player-4"
    # Win level 1 in solo only; team level 1 untouched.
    session_id, state = start_session(client, "solo-win", level=1, participant_id=participant, game_mode='solo')
    state, _ = win_level(client, session_id, state)
    client.post("/finish-session", json={"session_id": session_id, "result": state["outcome"]})

    solo = client.get(f"/progress?participant_id={participant}&mode=solo").json()["levels"]
    team = client.get(f"/progress?participant_id={participant}&mode=team").json()["levels"]
    solo_statuses = {p["level"]: p["status"] for p in solo}
    team_statuses = {p["level"]: p["status"] for p in team}
    assert_eq(solo_statuses[1], "completed", "Solo level 1 should be completed")
    assert_eq(team_statuses[1], "unlocked", "Team progress is tracked separately")

    # Both modes allow every level immediately.
    for mode in ("solo", "team"):
        for cfg in LEVELS:
            resp = client.post("/start-session", json={
                "participant_id": participant, "game_mode": mode, "level": cfg["level"],
            })
            assert resp.status_code == 200, f"{mode} level {cfg['level']} must be available: {resp.text}"
    print("PASS 4: Solo and team progression tracked independently; both modes open all levels")


def test_5_research_validity_level_and_difficulty_stored():
    client = fresh_client()
    participant = "research-player-5"
    # Level 3 starts directly (no gating).
    session_id, state = start_session(client, "research-l3", level=3, participant_id=participant)

    first = state["problems"][0]
    client.post("/select-problem", json={"session_id": session_id, "problem_id": first["id"]})
    resp = client.post("/apply-solution", json={
        "session_id": session_id, "action_type": CORRECT[first["id"]], "target_event": first["id"],
    })
    state = resp.json()["state"]

    # Interaction carries the mission level.
    interactions = main.db.get_all_interactions(session_id)
    assert interactions, "Expected recorded interactions"
    assert all(i.get("mission_level") == 3 for i in interactions), \
        "Every interaction in a level-3 session should carry mission_level=3"

    client.post("/finish-session", json={"session_id": session_id, "result": "manual"})
    session_results = client.get(f"/results?session_id={session_id}").json()["session"]
    assert_eq(session_results["level"], 3, "Session should store the mission level")
    assert_eq(session_results["mission_level"], 3, "Session should store mission_level")
    assert_eq(session_results["difficulty"], "Advanced", "Session should store difficulty")
    assert_eq(session_results["game_mode"], "solo", "Session should store game_mode")

    # XLSX Research Summary includes Mission Level + Difficulty.
    resp = client.get(f"/export/session-xlsx?session_id={session_id}")
    assert resp.status_code == 200, resp.text
    wb = load_workbook(BytesIO(resp.content))
    summary = wb["Research Summary"]
    assert_eq(summary["A34"].value, "Mission Level", "XLSX should label the Mission Level row")
    assert_eq(summary["B34"].value, 3, "XLSX Mission Level should be 3")
    assert_eq(summary["B35"].value, "Advanced", "XLSX Difficulty should be 'Advanced'")
    print("PASS 5: Level/difficulty/game_mode stored on interactions, session, and XLSX")


def test_6_every_level_winnable_with_90():
    client = fresh_client()
    participant = "full-progress-player-6"
    for cfg in LEVELS:
        session_id, state = start_session(client, f"win-l{cfg['level']}", level=cfg["level"], participant_id=participant)
        state, solves = win_level(client, session_id, state)
        assert_eq(state["game_status"], "won", f"Level {cfg['level']} should be winnable")
        assert state["accuracy"] >= 0.90, f"Level {cfg['level']} win must reach 90%"
        assert 5 <= solves <= 7, f"Level {cfg['level']} won in {solves} solves (expected ~5-7)"
        assert state["neural_energy"] > 0, f"Level {cfg['level']} win must not deplete energy"
        print(f"  level {cfg['level']} ({cfg['title']}): won in {solves} solves, acc={state['accuracy']:.3f}")
        client.post("/finish-session", json={"session_id": session_id, "result": state["outcome"]})
    print("PASS 6: All 4 levels winnable by solving 5-7 problems correctly")


if __name__ == "__main__":
    tests = [
        test_1_level_metadata_and_distinct_problem_sets,
        test_2_all_levels_immediately_available,
        test_3_progression_is_informational_only,
        test_4_solo_and_team_progression_kept_separate,
        test_5_research_validity_level_and_difficulty_stored,
        test_6_every_level_winnable_with_90,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR {test.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
