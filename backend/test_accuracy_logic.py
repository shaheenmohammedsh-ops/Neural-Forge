"""
Accuracy logic tests for AI Brain Lab.
Run: python test_accuracy_logic.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from simulation import NeuralSimulation


def assert_eq(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected}, got {actual}")


def assert_close(actual, expected, msg, tol=0.001):
    if abs(actual - expected) > tol:
        raise AssertionError(f"{msg}: expected {expected}, got {actual}")


def fresh_sim():
    return NeuralSimulation()


def test_1_select_all_problems_unchanged():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-1")
    initial = state.accuracy

    for problem in state.active_events:
        state = sim.select_problem(problem)
        assert_close(state.accuracy, initial, f"Accuracy changed after selecting {problem}")

    print("PASS test_1: Select all 7 problems -> Accuracy unchanged")


def test_2_switch_and_wait_unchanged():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-2")
    initial = state.accuracy

    problems = state.active_events
    for _ in range(3):
        for p in problems:
            state = sim.select_problem(p)

    for _ in range(30):
        state = sim.advance_time(1)

    assert_close(state.accuracy, initial, "Accuracy changed after switching and waiting 30s")
    assert state.time_remaining == 150, f"Time should decrease, got {state.time_remaining}"
    print("PASS test_2: Switch problems and wait 30s -> Accuracy unchanged")


def test_3_insufficient_energy_unchanged():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-3")
    initial = state.accuracy

    # Drain energy so actions cannot execute
    for node_id in sim.nodes:
        sim.nodes[node_id]["energy"] = 0

    state = sim.apply_game_action("clean_dataset")
    assert_close(state.accuracy, initial, "Accuracy changed on failed action (insufficient energy)")
    print("PASS test_3: Failed action (no energy) -> Accuracy unchanged")


def test_4_correct_solution_reward():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-4")
    initial = state.accuracy

    # Select Dirty Data and apply correct action
    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("clean_dataset")
    expected_reward = sim._calculate_correct_reward("clean_dataset", "Dirty Data")

    assert state.accuracy > initial, "Correct solution should increase accuracy"
    assert_close(state.accuracy, initial + expected_reward, "Correct reward amount mismatch")
    print(f"PASS test_4: Correct solution -> reward applied ({initial} -> {state.accuracy})")


def test_5_wrong_solution_penalty():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-5")
    initial = state.accuracy

    # Select Dirty Data but apply wrong action
    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("remove_noise")
    expected_penalty = sim._calculate_wrong_penalty("Dirty Data")

    assert state.accuracy < initial, "Wrong solution should decrease accuracy"
    assert_close(state.accuracy, initial - expected_penalty, "Wrong penalty amount mismatch")
    print(f"PASS test_5: Wrong solution -> penalty applied ({initial} -> {state.accuracy})")


def test_6_idle_after_wrong_unchanged():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-6")

    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("remove_noise")
    after_wrong = state.accuracy

    for _ in range(10):
        state = sim.advance_time(1)
    sim.select_problem("Noise")
    sim.select_problem("Dirty Data")

    assert_close(state.accuracy, after_wrong, "Accuracy changed after idle/navigation post-wrong")
    print("PASS test_6: Navigate/idle after wrong solution -> Accuracy unchanged")


def test_7_backend_state_consistency():
    sim = fresh_sim()
    state = sim.initialize_session("test-session-7")

    sim.select_problem("Dirty Data")
    state = sim.apply_game_action("clean_dataset")
    backend_accuracy = state.accuracy

    # get_current_state should return same accuracy (no passive mutation on read)
    reread = sim.get_current_state()
    assert_close(reread.accuracy, backend_accuracy, "get_current_state mutates accuracy")

    # Multiple re-reads stable
    for _ in range(5):
        reread = sim.get_current_state()
        assert_close(reread.accuracy, backend_accuracy, "Repeated get_current_state mutates accuracy")

    print("PASS test_7: Backend state consistent across reads")


def test_no_direct_mutations_outside_update():
    """Verify grep-level invariant: only _update_accuracy modifies base_accuracy during gameplay."""
    sim = fresh_sim()
    sim.initialize_session("audit-session")

    # Operations that must NOT change accuracy
    ops = [
        ("select Dirty Data", lambda: sim.select_problem("Dirty Data")),
        ("select Noise", lambda: sim.select_problem("Noise")),
        ("advance_time 5", lambda: sim.advance_time(5)),
        ("allocate_energy", lambda: sim.allocate_energy("Input_Layer", 5)),
        ("connect_nodes", lambda: sim.connect_nodes("Input_Layer", "Hidden_1")),
        ("disconnect_nodes", lambda: sim.disconnect_nodes("Input_Layer", "Hidden_1")),
        ("inspect_node", lambda: sim.inspect_node("Input_Layer")),
    ]

    for name, op in ops:
        before = sim.get_current_state().accuracy
        op()
        after = sim.get_current_state().accuracy
        assert_close(after, before, f"Passive accuracy change from {name}")

    print("PASS audit: No passive accuracy mutations from navigation/time/energy/connections")


if __name__ == "__main__":
    tests = [
        test_1_select_all_problems_unchanged,
        test_2_switch_and_wait_unchanged,
        test_3_insufficient_energy_unchanged,
        test_4_correct_solution_reward,
        test_5_wrong_solution_penalty,
        test_6_idle_after_wrong_unchanged,
        test_7_backend_state_consistency,
        test_no_direct_mutations_outside_update,
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
