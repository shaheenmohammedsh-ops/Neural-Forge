"""
End-condition priority tests for AI Brain Lab.

Verifies the deterministic game-end logic:
  (1) Reach 90% accuracy before timer/energy ends  -> SUCCESS (won)
  (2) Timer reaches 0 before 90%                   -> NOT ACHIEVED (timeout)
  (3) Energy reaches 0 before 90%                  -> NOT ACHIEVED (energy_depleted)
  (4) Edge: reach exactly 90% the moment timer or energy hits zero -> SUCCESS (won)

Run: python test_game_endings.py
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
from simulation import NeuralSimulation


def fresh_client():
    main.db = Database(os.path.join(tempfile.mkdtemp(), "test_neural_shield.db"))
    main.simulation = main.get_simulation()
    client = TestClient(main.app)
    return client


def fresh_sim():
    return NeuralSimulation()


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


def test_1_win_before_time_or_energy():
    sim = fresh_sim()
    state = sim.initialize_session("ending-win-1")

    # Solving 1-2 (or several) problems must NEVER end the game: accuracy stays
    # well below 90%. Only after solving ~6 problems does the model reach 90%.
    solve_plan = [
        ("Dirty Data", "clean_dataset"),
        ("Missing Values", "normalize_data"),
        ("Class Imbalance", "balance_dataset"),
        ("Data Drift", "collect_more_data"),
        ("Bias", "tune_hyperparameters"),
        ("Concept Drift", "validate_model"),
    ]

    for idx, (problem, action) in enumerate(solve_plan, start=1):
        sim.select_problem(problem)
        state = sim.apply_game_action(action)
        if idx < len(solve_plan):
            assert_eq(state.game_status, "playing",
                      f"Solving {idx} problem(s) must NOT end the game")
            assert state.accuracy < 0.90, \
                f"Accuracy must stay below 90%% until the final solve (was {state.accuracy:.3f} at {idx} solves)"

    assert_eq(state.accuracy >= 0.90, True, "Solving ~6 problems should reach the 90% target")
    assert_eq(state.game_status, "won", "Reaching target should end as won")
    assert_eq(state.outcome, "won", "Outcome should be 'won'")
    assert_eq(state.end_reason, "target_reached", "End reason should be target_reached")
    assert state.time_remaining > 0, "Win must occur before the timer hits zero"
    assert state.neural_energy > 0, "Win must occur before energy hits zero"
    print(f"PASS 1: Reached {state.accuracy:.3f} with time={state.time_remaining}s, "
          f"energy={state.neural_energy:.0f} -> {state.outcome}")


def test_2_timeout_when_timer_hits_zero():
    sim = fresh_sim()
    state = sim.initialize_session("ending-timeout-2")

    # Let the timer run out without reaching the target.
    state = sim.advance_time(180)

    assert_eq(state.time_remaining, 0, "Timer should reach zero")
    assert state.accuracy < 0.90, "Accuracy should be below target"
    assert_eq(state.game_status, "lost", "Game should be lost")
    assert_eq(state.outcome, "timeout", "Outcome should be 'timeout'")
    assert_eq(state.end_reason, "time_expired", "End reason should be time_expired")
    print(f"PASS 2: Time expired with accuracy={state.accuracy:.3f} -> {state.outcome}")


def test_3_energy_depleted_before_target():
    sim = fresh_sim()
    state = sim.initialize_session("ending-energy-3")

    # Drain all node energy without reaching the target.
    for node_id in sim.nodes:
        sim.nodes[node_id]["energy"] = 0
    state = sim.get_current_state()

    assert_eq(state.neural_energy, 0, "Energy should be zero")
    assert state.accuracy < 0.90, "Accuracy should be below target"
    assert_eq(state.game_status, "lost", "Game should be lost")
    assert_eq(state.outcome, "energy_depleted", "Outcome should be 'energy_depleted'")
    assert_eq(state.end_reason, "energy_depleted", "End reason should be energy_depleted")
    print(f"PASS 3: Energy depleted with accuracy={state.accuracy:.3f} -> {state.outcome}")


def test_4_edge_target_at_exact_zero_moment():
    sim = fresh_sim()
    state = sim.initialize_session("ending-edge-4")

    # Win must take priority even when timer AND energy are both at zero.
    sim.base_accuracy = 0.90
    sim.time_remaining = 0
    for node_id in sim.nodes:
        sim.nodes[node_id]["energy"] = 0
    state = sim.get_current_state()

    assert_eq(state.game_status, "won", "Reaching target at the zero moment must win")
    assert_eq(state.outcome, "won", "Outcome should be 'won' even at zero moment")
    assert_eq(state.end_reason, "target_reached", "End reason should be target_reached")
    print("PASS 4: Exact 90% at the moment timer/energy hit zero -> won (win priority)")


def test_5_api_finish_persists_authoritative_result():
    client = fresh_client()

    # Win scenario through the API: solving ~6 problems reaches the 90% target.
    resp = client.post("/start-session", json={"participant_id": None, "challenge_type": "Easy", "challenge_order": 1})
    session_id = resp.json()["session_id"]
    plan = [
        ("Dirty Data", "clean_dataset"),
        ("Missing Values", "normalize_data"),
        ("Class Imbalance", "balance_dataset"),
        ("Data Drift", "collect_more_data"),
        ("Bias", "tune_hyperparameters"),
        ("Concept Drift", "validate_model"),
    ]
    state = None
    for problem, action in plan:
        client.post("/select-problem", json={"session_id": session_id, "problem_id": problem})
        state = client.post("/apply-game-action", json={"session_id": session_id, "action_type": action}).json()["state"]
    assert_eq(state["game_status"], "won", "Game should be won")

    # Even if the client wrongly reports a failure, the backend must keep 'won'.
    resp = client.post("/finish-session", json={
        "session_id": session_id, "result": "time_expired",
        "challenge_type": "Easy", "challenge_order": 1
    })
    assert resp.status_code == 200, resp.text
    stored_result = resp.json()["final_metrics"]["result"]
    assert_eq(stored_result, "won", "Backend must store 'won', not the wrong client result")

    results = client.get(f"/results?session_id={session_id}").json()["session"]
    assert_eq(results["result"], "won", "Results screen must read stored 'won'")
    assert 0.0 <= results["completion_time"] <= 180.0, f"Completion time out of range: {results['completion_time']}"

    # XLSX must report Completed (not Failed) for the won session.
    resp = client.get(f"/export/session-xlsx?session_id={session_id}")
    assert resp.status_code == 200, resp.text
    wb = load_workbook(BytesIO(resp.content))
    summary = wb["Research Summary"]
    assert_eq(summary["B32"].value, "Completed", "XLSX must show Completed for a won session")
    assert_eq(summary["B32"].fill.fgColor.rgb, "FFD1FAE5", "XLSX result cell should be green")
    print(f"PASS 5: API win persisted as 'won', XLSX shows Completed, time={results['completion_time']:.0f}s")


def test_6_api_timeout_and_energy_depleted_results():
    # Timeout through the API.
    client = fresh_client()
    resp = client.post("/start-session", json={"participant_id": None, "challenge_type": "Easy", "challenge_order": 2})
    session_id = resp.json()["session_id"]
    for _ in range(180):
        state = client.post("/advance-time", json={"session_id": session_id, "action_type": "1"}).json()["state"]
        if state["game_status"] != "playing":
            break
    assert_eq(state["game_status"], "lost", "Game should be lost on timeout")
    assert_eq(state["outcome"], "timeout", "Outcome should be timeout")
    client.post("/finish-session", json={"session_id": session_id, "result": state["outcome"],
                                         "challenge_type": "Easy", "challenge_order": 2})
    results = client.get(f"/results?session_id={session_id}").json()["session"]
    assert_eq(results["result"], "timeout", "Stored result should be timeout")

    # Energy depleted through the API.
    client = fresh_client()
    resp = client.post("/start-session", json={"participant_id": None, "challenge_type": "Easy", "challenge_order": 3})
    session_id = resp.json()["session_id"]
    for node_id in main.simulation.nodes:
        main.simulation.nodes[node_id]["energy"] = 0
    state = main.simulation.get_current_state()
    assert_eq(state.outcome, "energy_depleted", "Outcome should be energy_depleted")
    client.post("/finish-session", json={"session_id": session_id, "result": state.outcome,
                                         "challenge_type": "Easy", "challenge_order": 3})
    results = client.get(f"/results?session_id={session_id}").json()["session"]
    assert_eq(results["result"], "energy_depleted", "Stored result should be energy_depleted")

    print("PASS 6: API timeout -> 'timeout', API energy depletion -> 'energy_depleted'")


if __name__ == "__main__":
    tests = [
        test_1_win_before_time_or_energy,
        test_2_timeout_when_timer_hits_zero,
        test_3_energy_depleted_before_target,
        test_4_edge_target_at_exact_zero_moment,
        test_5_api_finish_persists_authoritative_result,
        test_6_api_timeout_and_energy_depleted_results,
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
            print(f"ERROR {test.__name__}: {e}")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
