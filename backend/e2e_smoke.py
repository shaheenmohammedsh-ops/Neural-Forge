"""End-to-end smoke test against a real running backend server.

Spawns `python main.py` (uvicorn on :8080), waits for readiness, then runs a
complete SOLO session and a complete TEAM session over real HTTP, then kills
the server.

Run: python e2e_smoke.py   (from the backend dir)
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

BASE = "http://localhost:8080"
FAILURES = []


def post(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=10) as resp:
        return resp.read()


def get_json(path):
    return json.loads(get(path).decode("utf-8"))


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"{status} {name}" + (f" | {detail}" if detail and not cond else ""))
    if not cond:
        FAILURES.append(name)


def start(game_mode, team_size=1):
    data = post("/start-session", {
        "participant_id": None,
        "challenge_type": "Easy",
        "challenge_order": 1,
        "team_mode": game_mode == "team",
        "team_size": team_size,
        "game_mode": game_mode,
    })
    return data["session_id"], data["state"]


def main():
    server = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        # Wait for readiness (max ~15s)
        ready = False
        for _ in range(60):
            try:
                post("/start-session", {
                    "participant_id": None, "challenge_type": "Easy",
                    "challenge_order": 1, "team_mode": False, "team_size": 1,
                    "game_mode": "solo",
                })
                ready = True
                break
            except Exception:
                time.sleep(0.25)
        check("server ready", ready, "backend did not come up")

        # ---------------- SOLO ----------------
        sid, state = start("solo")
        check("solo: game_mode in state", state.get("game_mode") == "solo")
        check("solo: team_mode off", state.get("team_mode") is False)
        check("solo: no active role", state.get("active_role") is None)

        post("/select-problem", {"session_id": sid, "problem_id": "Dirty Data"})
        r = post("/apply-solution", {
            "session_id": sid, "action_type": "clean_dataset",
            "target_event": "Dirty Data",
        })
        acc_solo = r["state"]["accuracy"]
        check("solo: correct clean_dataset reward 0.5->0.536",
              abs(acc_solo - 0.536) < 1e-9, f"acc={acc_solo}")

        for _ in range(5):
            post("/advance-time", {"session_id": sid, "action_type": "5"})

        post("/finish-session", {
            "session_id": sid, "result": "manual", "game_mode": "solo",
        })
        results = get_json("/results?session_id=" + sid)
        check("solo: results carry final accuracy",
              results["session"].get("final_accuracy") is not None)
        xlsx = get("/export/session-xlsx?session_id=" + sid)
        check("solo: xlsx export non-empty", len(xlsx) > 1000)

        # ---------------- TEAM ----------------
        sid, state = start("team", 3)
        check("team: game_mode in state", state.get("game_mode") == "team")
        check("team: team_mode on", state.get("team_mode") is True)
        check("team: team_size 3", state.get("team_size") == 3)

        r = post("/set-role", {"session_id": sid, "role": "Data Analyst"})
        check("team: active role set", r["state"].get("active_role") == "Data Analyst")
        # role switch must not change accuracy
        check("team: role switch keeps accuracy",
              r["state"]["accuracy"] == state["accuracy"])

        post("/select-problem", {
            "session_id": sid, "problem_id": "Dirty Data",
            "role": "Data Analyst",
        })
        r = post("/apply-solution", {
            "session_id": sid, "action_type": "clean_dataset",
            "target_event": "Dirty Data", "role": "Data Analyst",
        })
        acc_team = r["state"]["accuracy"]
        check("team: Data Analyst bonus > solo",
              acc_team > acc_solo, f"solo={acc_solo} team={acc_team}")
        check("team: bonus bounded (<+10pp)",
              acc_team - acc_solo < 0.10, f"delta={acc_team - acc_solo}")

        for _ in range(5):
            post("/advance-time", {"session_id": sid, "action_type": "5"})

        post("/finish-session", {
            "session_id": sid, "result": "manual", "game_mode": "team",
        })
        results = get_json("/results?session_id=" + sid)
        check("team: results role count > 0",
              len(results["session"].get("roles_used") or []) > 0)
        xlsx = get("/export/session-xlsx?session_id=" + sid)
        check("team: xlsx export non-empty", len(xlsx) > 1000)

        # Results Screen XLSX download via the real UI endpoint shape
        print("---")
        if FAILURES:
            print(f"E2E: {len(FAILURES)} FAILURES: {FAILURES}")
            sys.exit(1)
        print("E2E: ALL PASS")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    main()
