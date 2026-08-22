"""
Game duration / progression tests.

Verifies that solving 1-2 (or several) problems NEVER ends the session unless the
90% accuracy target is actually reached, and that skip/revisit keep the game
playable until one of the three legitimate end conditions fires.

Run: python test_progression.py
"""
import sys
import os
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

from simulation import NeuralSimulation


def fresh_sim():
    return NeuralSimulation()


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")


def test_1_one_solved_continues():
    sim = fresh_sim()
    sim.initialize_session("prog-1")
    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("clean_dataset")
    assert_eq(state.events_solved, 1, "One problem should be solved")
    assert_eq(state.game_status, "playing", "Game must continue after 1 solve")
    assert_eq(state.accuracy < 0.90, True, "Accuracy must stay below target after 1 solve")
    assert_eq(state.problem_states["Dirty Data"], "SOLVED", "Problem should be marked SOLVED")
    print(f"PASS prog_1: 1 solved -> continues (acc={state.accuracy:.3f})")


def test_2_two_solved_continues():
    sim = fresh_sim()
    sim.initialize_session("prog-2")
    for problem, action in [
        ("Dirty Data", "clean_dataset"),
        ("Missing Values", "normalize_data"),
    ]:
        sim.select_problem(problem)
        state = sim.apply_game_action(action)
    assert_eq(state.events_solved, 2, "Two problems should be solved")
    assert_eq(state.game_status, "playing", "Game must continue after 2 solves")
    assert state.accuracy < 0.90, f"2 solves must stay below 90% (was {state.accuracy:.3f})"
    print(f"PASS prog_2: 2 solved -> continues (acc={state.accuracy:.3f})")


def test_3_several_solved_continues():
    sim = fresh_sim()
    sim.initialize_session("prog-3")
    plan = [
        ("Dirty Data", "clean_dataset"),
        ("Missing Values", "normalize_data"),
        ("Noise", "remove_noise"),
        ("Class Imbalance", "balance_dataset"),
    ]
    state = None
    for problem, action in plan:
        sim.select_problem(problem)
        state = sim.apply_game_action(action)
    assert_eq(state.events_solved, 4, "Four problems should be solved")
    assert_eq(state.game_status, "playing", "Game must continue after 4 solves")
    assert state.accuracy < 0.90, f"4 solves must stay below 90% (was {state.accuracy:.3f})"
    print(f"PASS prog_3: 4 solved -> continues (acc={state.accuracy:.3f})")


def test_4_skip_and_revisit_continues():
    sim = fresh_sim()
    sim.initialize_session("prog-4")
    state = sim.get_current_state()

    # Skip a problem then revisit it; both must leave the game playing.
    sim.select_problem("Noise")
    state = sim.skip_problem("Noise")
    assert_eq(state.problem_states["Noise"], "SKIPPED", "Noise should be SKIPPED")
    assert_eq(state.game_status, "playing", "Skipping must not end the game")

    state = sim.revisit_problem("Noise")
    assert_eq(state.problem_states["Noise"], "SELECTED", "Revisit should reselect Noise")
    assert_eq(state.game_status, "playing", "Revisiting must not end the game")

    # Solve one problem while another is skipped; game still continues.
    sim.apply_game_action("remove_noise")
    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("clean_dataset")
    assert_eq(state.game_status, "playing", "Game continues with a mix of solved/skipped")
    assert state.accuracy < 0.90, f"Must stay below 90% (was {state.accuracy:.3f})"
    print(f"PASS prog_4: skip + revisit -> continues (acc={state.accuracy:.3f})")


def test_5_all_seven_available_for_navigation():
    sim = fresh_sim()
    sim.initialize_session("prog-5")
    state = sim.get_current_state()
    assert_eq(len(state.problems), 7, "All 7 problems must be available")
    assert_eq(len(state.active_events), 7, "All 7 problems must be in the active set")
    # Every problem can be selected without changing any metric.
    acc = state.accuracy
    bh = state.brain_health
    en = state.neural_energy
    sc = state.score
    for problem in state.active_events:
        nxt = sim.select_problem(problem)
        assert_eq(nxt.accuracy, acc, "Selecting must not change accuracy")
        assert_eq(nxt.brain_health, bh, "Selecting must not change brain health")
        assert_eq(nxt.neural_energy, en, "Selecting must not change energy")
        assert_eq(nxt.score, sc, "Selecting must not change score")
    print("PASS prog_5: all 7 problems selectable without metric changes")


def test_6_reach_90_success():
    sim = fresh_sim()
    sim.initialize_session("prog-6")
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
        sim.select_problem(problem)
        state = sim.apply_game_action(action)
    assert_eq(state.game_status, "won", "90% target must produce SUCCESS")
    assert_eq(state.outcome, "won", "Outcome must be won")
    assert state.accuracy >= 0.90, f"Accuracy must be >= 0.90 (was {state.accuracy:.3f})"
    print(f"PASS prog_6: reach 90% -> SUCCESS (acc={state.accuracy:.3f})")


def test_7_timer_up_before_90():
    sim = fresh_sim()
    state = sim.initialize_session("prog-7")
    state = sim.advance_time(180)
    assert_eq(state.time_remaining, 0, "Timer should be zero")
    assert state.accuracy < 0.90, "Accuracy must be below target for TIME UP"
    assert_eq(state.game_status, "lost", "Timer expiry must end the game")
    assert_eq(state.outcome, "timeout", "Outcome must be timeout")
    print("PASS prog_7: timer reaches 0 before 90% -> TIME UP")


def test_8_energy_zero_before_90():
    sim = fresh_sim()
    state = sim.initialize_session("prog-8")
    for node_id in sim.nodes:
        sim.nodes[node_id]["energy"] = 0
    state = sim.get_current_state()
    assert_eq(state.neural_energy, 0, "Energy should be zero")
    assert state.accuracy < 0.90, "Accuracy must be below target for ENERGY DEPLETED"
    assert_eq(state.game_status, "lost", "Energy depletion must end the game")
    assert_eq(state.outcome, "energy_depleted", "Outcome must be energy_depleted")
    print("PASS prog_8: energy reaches 0 before 90% -> ENERGY DEPLETED")


def test_9_solved_problems_stay_solved_until_end():
    sim = fresh_sim()
    sim.initialize_session("prog-9")
    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("clean_dataset")
    assert_eq(state.problem_states["Dirty Data"], "SOLVED", "Dirty Data stays SOLVED")
    # The remaining 6 problems are still available.
    available = [p for p, st in state.problem_states.items() if st != "SOLVED"]
    assert_eq(len(available), 6, "Six problems must remain available")
    # The game is still playing.
    assert_eq(state.game_status, "playing", "Game continues with 6 problems left")
    print("PASS prog_9: solved problems stay SOLVED; the rest remain playable")


if __name__ == "__main__":
    tests = [
        test_1_one_solved_continues,
        test_2_two_solved_continues,
        test_3_several_solved_continues,
        test_4_skip_and_revisit_continues,
        test_5_all_seven_available_for_navigation,
        test_6_reach_90_success,
        test_7_timer_up_before_90,
        test_8_energy_zero_before_90,
        test_9_solved_problems_stay_solved_until_end,
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
