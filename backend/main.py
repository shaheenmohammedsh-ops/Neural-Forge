from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from io import BytesIO
import uuid
import json
import pandas as pd
from datetime import datetime
import xlsxwriter
from models import Database, Interaction
from simulation import get_simulation

app = FastAPI(title="Neural Shield AI Learning Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()
simulation = get_simulation()


def simulation_state_snapshot(state):
    return {
        "accuracy": state.accuracy,
        "loss": state.loss,
        "precision": state.precision,
        "recall": state.recall,
        "brain_health": state.brain_health,
        "neural_energy": state.neural_energy,
        "current_event": state.current_event,
        "active_events": state.active_events,
        "problem_states": state.problem_states,
        "problems": state.problems,
        "solutions": state.solutions,
        "nodes": get_nodes_snapshot(),
        "events_solved": state.events_solved,
        "total_events": state.total_events,
        "current_level": state.current_level,
        "time_remaining": state.time_remaining,
        "score": state.score,
        "combo": state.combo,
        "game_status": state.game_status,
        "end_reason": state.end_reason,
        "outcome": state.outcome,
        "max_time": state.max_time,
        "last_result": state.last_result,
        "last_message": state.last_message,
        "last_problem": state.last_problem,
        "last_action": state.last_action,
        "team_mode": state.team_mode,
        "team_size": state.team_size,
        "game_mode": state.game_mode,
        "active_role": state.active_role,
        "mission_level": getattr(state, 'mission_level', 1),
        "mission_title": getattr(state, 'mission_title', None),
        "mission_subtitle": getattr(state, 'mission_subtitle', None),
        "difficulty": getattr(state, 'difficulty', None),
    }


def state_payload(state) -> dict:
    """Uniform state payload used by every endpoint response."""
    return simulation_state_snapshot(state)


def get_nodes_snapshot() -> dict:
    try:
        return simulation.get_nodes()
    except Exception:
        return {}


def normalize_result(raw: Optional[str]) -> str:
    """Normalize any legacy result value to the reliable canonical outcome."""
    mapping = {
        'won': 'won',
        'target_reached': 'won',
        'timeout': 'timeout',
        'time_expired': 'timeout',
        'energy_depleted': 'energy_depleted',
        'manual': 'manual',
    }
    return mapping.get(raw, 'manual')


def authoritative_result(state, requested: Optional[str]) -> str:
    """Determine the final outcome with strict priority.

    1) Reaching the 90% target ALWAYS wins - even on the exact moment the timer
       or energy hits zero. Never report a reached target as a failure.
    2) Otherwise, a zero timer is TIMEOUT.
    3) Otherwise, zero energy is ENERGY DEPLETED.
    4) Fallback to the requested result or manual.
    """
    if state.game_status == 'won' or state.accuracy >= 0.90:
        return 'won'
    if state.time_remaining <= 0:
        return 'timeout'
    if state.neural_energy <= 0:
        return 'energy_depleted'
    return normalize_result(requested)


def record_event(
    session_id,
    action_type,
    target,
    state_before,
    state_after,
    role=None,
    decision_time=None,
    reaction_time=None,
    energy_spent=None,
    expected_impact=None,
    problem_state=None,
    is_success=None,
    event_solved=None,
):
    """Record one meaningful interaction event for research analysis."""
    accuracy_changed = state_after.accuracy != state_before.accuracy
    if is_success is None:
        is_success = 1 if (accuracy_changed and state_after.accuracy > state_before.accuracy) else 0
    if event_solved is None:
        event_solved = 1 if state_after.events_solved > state_before.events_solved else 0

    interaction = Interaction(
        session_id=session_id,
        action_type=action_type,
        target_node=target,
        event_type=target or state_after.current_event,
        role=role,
        problem_state=problem_state,
        energy_spent=energy_spent,
        expected_impact=expected_impact,
        decision_time=decision_time,
        reaction_time=reaction_time,
        accuracy_before=state_before.accuracy,
        loss_before=state_before.loss,
        precision_before=state_before.precision,
        recall_before=state_before.recall,
        brain_health_before=state_before.brain_health,
        neural_energy_before=state_before.neural_energy,
        accuracy_after=state_after.accuracy,
        loss_after=state_after.loss,
        precision_after=state_after.precision,
        recall_after=state_after.recall,
        brain_health_after=state_after.brain_health,
        neural_energy_after=state_after.neural_energy,
        time_remaining=state_after.time_remaining,
        combo=state_after.combo,
        level=state_after.current_level,
        is_success=is_success,
        event_solved=event_solved,
        mission_level=getattr(state_after, 'mission_level', 1),
    )
    db.record_interaction(interaction)


def record_interaction_from_states(session_id, action_type, target_node, energy_allocated, state_before, state_after, **kwargs):
    event_solved = kwargs.pop('event_solved', None)
    if event_solved is None:
        event_solved = 1 if state_after.events_solved > state_before.events_solved else 0
    is_success = kwargs.pop('is_success', None)
    if is_success is None:
        accuracy_changed = state_after.accuracy != state_before.accuracy
        is_success = 1 if accuracy_changed and state_after.accuracy > state_before.accuracy else 0

    interaction = Interaction(
        session_id=session_id,
        action_type=action_type,
        target_node=target_node,
        energy_allocated=energy_allocated,
        event_type=target_node or state_after.current_event,
        accuracy_before=state_before.accuracy,
        loss_before=state_before.loss,
        precision_before=state_before.precision,
        recall_before=state_before.recall,
        brain_health_before=state_before.brain_health,
        neural_energy_before=state_before.neural_energy,
        accuracy_after=state_after.accuracy,
        loss_after=state_after.loss,
        precision_after=state_after.precision,
        recall_after=state_after.recall,
        brain_health_after=state_after.brain_health,
        neural_energy_after=state_after.neural_energy,
        time_remaining=state_after.time_remaining,
        combo=state_after.combo,
        level=state_after.current_level,
        is_success=is_success,
        event_solved=event_solved,
        mission_level=getattr(state_after, 'mission_level', 1),
        **kwargs,
    )
    db.record_interaction(interaction)

class StartSessionRequest(BaseModel):
    participant_id: Optional[str] = None
    challenge_type: Optional[str] = None
    challenge_order: Optional[int] = None
    team_mode: Optional[bool] = False
    team_size: Optional[int] = 1
    game_mode: Optional[str] = None
    level: Optional[int] = 1
    difficulty: Optional[str] = None

class ActionRequest(BaseModel):
    session_id: str
    action_type: str
    target_node: Optional[str] = None
    energy_allocated: Optional[float] = None
    source_node: Optional[str] = None
    target_node_connect: Optional[str] = None

class GameActionRequest(BaseModel):
    session_id: str
    action_type: str
    target_event: Optional[str] = None

class SelectProblemRequest(BaseModel):
    session_id: str
    problem_id: str
    role: Optional[str] = None

class SkipProblemRequest(BaseModel):
    session_id: str
    problem_id: str
    role: Optional[str] = None

class RevisitProblemRequest(BaseModel):
    session_id: str
    problem_id: str
    role: Optional[str] = None

class SetRoleRequest(BaseModel):
    session_id: str
    role: Optional[str] = None

class PreviewActionRequest(BaseModel):
    session_id: str
    action_type: str
    target_event: str

class ApplySolutionRequest(BaseModel):
    session_id: str
    action_type: str
    target_event: str
    role: Optional[str] = None
    decision_time: Optional[float] = None  # ms, preview shown -> confirm
    reaction_time: Optional[float] = None  # ms, drag started -> dropped

class FinishSessionRequest(BaseModel):
    session_id: str
    result: Optional[str] = None
    challenge_type: Optional[str] = None
    challenge_order: Optional[int] = None
    game_mode: Optional[str] = None

@app.post("/start-session")
async def start_session(request: StartSessionRequest):
    try:
        session_id = str(uuid.uuid4())

        # Stable per-browser participant for progression. When a study_key is
        # provided we reuse the participant across levels; otherwise a new one.
        study_key = request.participant_id
        if study_key:
            participant_id = db.get_or_create_participant(study_key)
        else:
            participant_id = db.create_participant(session_id)

        team_mode = bool(request.team_mode)
        team_size = int(request.team_size or 1)
        game_mode = (request.game_mode or ('team' if team_mode else 'solo')).lower()
        if game_mode not in ('solo', 'team'):
            game_mode = 'team' if team_mode else 'solo'
        if game_mode == 'team':
            team_mode = True
            team_size = max(1, team_size)
        else:
            team_mode = False
            team_size = 1

        # Every level is always unlocked and independently playable.
        level = max(1, min(4, int(request.level or 1)))

        level_cfg = simulation.level_config_for(level)
        difficulty = request.difficulty or level_cfg.get("difficulty")

        session_db_id = db.create_session(
            participant_id, session_id, level_cfg.get("title"), level,
            game_mode, level=level, difficulty=difficulty,
        )
        state = simulation.initialize_session(
            session_id, team_mode=team_mode, team_size=team_size,
            game_mode=game_mode, level=level,
        )

        return {
            "session_id": session_id,
            "participant_id": participant_id,
            "session_db_id": session_db_id,
            "message": "Session started successfully",
            "state": state_payload(state),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress")
async def get_progress(participant_id: str, mode: str = 'solo'):
    try:
        if mode not in ('solo', 'team'):
            mode = 'solo'
        participant_id = db.get_or_create_participant(participant_id)
        progress = db.get_progress(participant_id, mode)
        return {
            "participant_id": participant_id,
            "mode": mode,
            "levels": progress,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply-action")
async def apply_action(request: ActionRequest):
    try:
        state_before = simulation.get_current_state()
        state = state_before
        
        if request.action_type == "allocate_energy":
            if request.target_node and request.energy_allocated:
                state = simulation.allocate_energy(request.target_node, request.energy_allocated)
        elif request.action_type == "connect_nodes":
            if request.source_node and request.target_node_connect:
                state = simulation.connect_nodes(request.source_node, request.target_node_connect)
        elif request.action_type == "disconnect_nodes":
            if request.source_node and request.target_node_connect:
                state = simulation.disconnect_nodes(request.source_node, request.target_node_connect)
        elif request.action_type == "solve_event":
            state = simulation.solve_event()
        elif request.action_type == "inspect_node":
            if request.target_node:
                node_info = simulation.inspect_node(request.target_node)
                return {
                    "state": state_payload(state),
                    "node_info": node_info
                }
        
        state_after = simulation.get_current_state()
        
        if request.action_type != "inspect_node":
            record_interaction_from_states(
                request.session_id,
                request.action_type,
                request.target_node,
                request.energy_allocated,
                state_before,
                state_after
            )
        
        return {
            "state": state_payload(state_after),
            "is_complete": simulation.is_complete()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/select-problem")
async def select_problem(request: SelectProblemRequest):
    try:
        state_before = simulation.get_current_state()
        state_after = simulation.select_problem(request.problem_id)
        record_event(
            request.session_id,
            "select_problem",
            request.problem_id,
            state_before,
            state_after,
            role=request.role or simulation.active_role,
            problem_state=state_after.problem_states.get(request.problem_id),
        )
        return {"state": state_payload(state_after)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/skip-problem")
async def skip_problem(request: SkipProblemRequest):
    try:
        state_before = simulation.get_current_state()
        state_after = simulation.skip_problem(request.problem_id)
        if state_after.problem_states.get(request.problem_id) == "SKIPPED":
            record_event(
                request.session_id,
                "skip_problem",
                request.problem_id,
                state_before,
                state_after,
                role=request.role or simulation.active_role,
                problem_state="SKIPPED",
            )
        return {"state": state_payload(state_after)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/revisit-problem")
async def revisit_problem(request: RevisitProblemRequest):
    try:
        state_before = simulation.get_current_state()
        state_after = simulation.revisit_problem(request.problem_id)
        if state_after.problem_states.get(request.problem_id) == "SELECTED":
            record_event(
                request.session_id,
                "revisit_problem",
                request.problem_id,
                state_before,
                state_after,
                role=request.role or simulation.active_role,
                problem_state="SELECTED",
            )
        return {"state": state_payload(state_after)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/set-role")
async def set_role(request: SetRoleRequest):
    try:
        state_before = simulation.get_current_state()
        state_after = simulation.set_active_role(request.role)
        if state_after.active_role != state_before.active_role:
            record_event(
                request.session_id,
                "role_switch",
                None,
                state_before,
                state_after,
                role=request.role,
                problem_state=state_after.problem_states.get(state_after.current_event),
            )
        return {"state": state_payload(state_after)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/preview-action")
async def preview_action(request: PreviewActionRequest):
    try:
        preview = simulation.preview_action(request.action_type, request.target_event)
        return {"preview": preview}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply-solution")
async def apply_solution(request: ApplySolutionRequest):
    try:
        state_before = simulation.get_current_state()
        preview = simulation.preview_action(request.action_type, request.target_event)
        expected_impact = preview.get("expected_impact") if preview.get("valid") else None

        state_after = simulation.apply_game_action(request.action_type, request.target_event)

        correct = state_after.accuracy > state_before.accuracy
        energy_spent = state_before.neural_energy - state_after.neural_energy
        if energy_spent < 0:
            energy_spent = simulation.action_effects.get(request.action_type, {}).get("energy_cost", 0)
        role = request.role or simulation.active_role

        record_event(
            request.session_id,
            "apply_solution",
            request.target_event,
            state_before,
            state_after,
            role=role,
            decision_time=request.decision_time,
            reaction_time=request.reaction_time,
            energy_spent=energy_spent,
            expected_impact=expected_impact,
            problem_state=state_after.problem_states.get(request.target_event),
            is_success=1 if correct else 0,
        )

        return {
            "state": state_payload(state_after),
            "is_complete": simulation.is_complete(),
            "result": {
                "correct": correct,
                "message": state_after.last_message,
                "accuracy_before": state_before.accuracy,
                "accuracy_after": state_after.accuracy,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/apply-game-action")
async def apply_game_action(request: GameActionRequest):
    try:
        state_before = simulation.get_current_state()
        state_after = simulation.apply_game_action(request.action_type, request.target_event)

        correct = state_after.accuracy > state_before.accuracy
        energy_spent = simulation.action_effects.get(request.action_type, {}).get("energy_cost")

        record_interaction_from_states(
            request.session_id,
            request.action_type,
            request.target_event,
            None,
            state_before,
            state_after,
            is_success=1 if correct else 0,
            energy_spent=energy_spent,
            problem_state=state_after.problem_states.get(request.target_event or state_before.current_event),
        )

        return {
            "state": state_payload(state_after),
            "is_complete": simulation.is_complete()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/advance-time")
async def advance_time(request: GameActionRequest):
    try:
        state_before = simulation.get_current_state()
        seconds = int(request.action_type) if request.action_type.isdigit() else 1
        state_after = simulation.advance_time(seconds)

        record_interaction_from_states(
            request.session_id,
            "advance_time",
            None,
            None,
            state_before,
            state_after
        )

        return {
            "state": state_payload(state_after),
            "is_complete": simulation.is_complete()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/finish-session")
async def finish_session(request: FinishSessionRequest):
    try:
        state = simulation.get_current_state()
        
        # CRITICAL: Use simulation session start time for display reference only
        session_start_time = state.session_start_time
        if not session_start_time:
            # Fallback to database if simulation doesn't have it
            session_data = db.get_session_results(request.session_id)
            if session_data.get('start_time'):
                session_start_time = session_data.get('start_time')
                if isinstance(session_start_time, str):
                    session_start_time = datetime.fromisoformat(session_start_time)
        
        # CRITICAL: Elapsed gameplay time comes ONLY from the controlled 3-minute
        # game timer (max_time - time_remaining). Wall-clock timestamps must NOT be
        # used for gameplay duration, since they include tutorial time, tab switches,
        # and server-side latency.
        completion_time = max(0.0, min(180.0, float(state.max_time - state.time_remaining)))
        
        interactions = db.get_all_interactions(request.session_id)

        # CRITICAL: Action totals must count ONLY real solution decisions, not the
        # every-second game-clock polls (advance_time) or navigation rows
        # (select/skip/revisit/role_switch). The frontend advances the clock once
        # per second, so a naive len(interactions) would inflate "Total Actions"
        # by ~180 and make Success Rate meaningless. Solution decisions are
        # recorded as action_type "apply_solution" (or a direct solution-card id
        # via the legacy game-action path); node ops such as allocate_energy /
        # connect_nodes / investigate_node are NOT solution decisions.
        SOLUTION_ACTION_TYPES = {"apply_solution", "solve_event"} | set(simulation.action_effects.keys())
        solution_rows = [i for i in interactions if i.get('action_type') in SOLUTION_ACTION_TYPES]
        total_actions = len(solution_rows)
        correct_actions = sum(1 for i in solution_rows if int(i.get('event_solved', 0) or 0) == 1)
        wrong_actions = total_actions - correct_actions
        total_events = int(state.total_events or 0)

        # Team-level and navigation summary (team-level outcome data, separated
        # from individual interaction rows below).
        skipped_count = sum(1 for i in interactions if i.get('action_type') == 'skip_problem')
        revisited_count = sum(1 for i in interactions if i.get('action_type') == 'revisit_problem')
        problems_selected = sum(1 for i in interactions if i.get('action_type') == 'select_problem')
        roles_used = sorted({str(i.get('role')) for i in interactions if i.get('role')})
        
        # CRITICAL: Determine result from the actual terminal condition with strict
        # priority. Reaching the 90% target always wins, even if the timer or energy
        # also reached zero on the same moment. The stored outcome is authoritative
        # and is what the Results screen and XLSX report use.
        result = authoritative_result(state, request.result)
        
        final_metrics = {
            "accuracy": state.accuracy,
            "loss": state.loss,
            "precision": state.precision,
            "recall": state.recall,
            "brain_health": state.brain_health,
            "neural_energy": state.neural_energy,
            "events_solved": state.events_solved,
            "current_level": state.current_level,
            "time_remaining": state.time_remaining,
            "score": state.score,
            "combo": state.combo,
            "game_status": state.game_status,
            "end_reason": state.end_reason,
            "outcome": state.outcome,
            "completion_time": completion_time,
            "total_actions": total_actions,
            "correct_actions": correct_actions,
            "wrong_actions": wrong_actions,
            "total_events": total_events,
            "challenge_type": request.challenge_type,
            "challenge_order": request.challenge_order,
            "result": result,
            "session_start_time": session_start_time,
            "team_mode": 1 if state.team_mode else 0,
            "team_size": state.team_size,
            "skipped_count": skipped_count,
            "revisited_count": revisited_count,
            "problems_selected": problems_selected,
            "roles_used": json.dumps(roles_used) if roles_used else None,
            "game_mode": state.game_mode or request.game_mode,
            "level": getattr(state, 'mission_level', 1),
            "difficulty": getattr(state, 'difficulty', None),
            "mission_level": getattr(state, 'mission_level', 1),
        }
        
        db.update_session(request.session_id, final_metrics)

        # Record progression for the participant in this mode.
        session_row = db.get_session_results(request.session_id)
        participant_id = session_row.get('participant_id')
        if participant_id:
            db.record_level_completion(
                participant_id,
                final_metrics["game_mode"],
                final_metrics["level"],
                result,
                state.accuracy,
            )
        
        return {
            "session_id": request.session_id,
            "final_metrics": final_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results")
async def get_results(session_id: str):
    try:
        session_data = db.get_session_results(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        interactions = db.get_all_interactions(session_id)
        
        return {
            "session": session_data,
            "interactions": interactions
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/session-xlsx")
async def export_session_xlsx(session_id: str):
    try:
        # Data validation
        session_data = db.get_session_results(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        interactions = db.get_all_interactions(session_id)
        if not interactions:
            raise HTTPException(status_code=404, detail="No interactions found for session")

        # Team-level role breakdown (individual interaction data, aggregated for the
        # Team Summary sheet so team outcomes stay separate from raw rows).
        roles_used = sorted({str(i.get('role')) for i in interactions if i.get('role')})

        # Validate session data
        if not session_data.get('session_id'):
            raise HTTPException(status_code=400, detail="Invalid session data: missing session_id")
        if not session_data.get('participant_id'):
            raise HTTPException(status_code=400, detail="Invalid session data: missing participant_id")

        # CRITICAL: Validate all numeric values before export
        # These validations match the Results Screen display logic
        
        # Accuracy: 0.0 to 1.0 (representing 0% to 100%)
        final_accuracy = session_data.get('final_accuracy', 0)
        if not (0.0 <= final_accuracy <= 1.0):
            print(f"WARNING: Invalid final_accuracy in XLSX export: {final_accuracy}")
            final_accuracy = max(0.0, min(1.0, final_accuracy))
        
        # Precision: 0.0 to 1.0
        final_precision = session_data.get('final_precision', 0)
        if not (0.0 <= final_precision <= 1.0):
            print(f"WARNING: Invalid final_precision in XLSX export: {final_precision}")
            final_precision = max(0.0, min(1.0, final_precision))
        
        # Recall: 0.0 to 1.0
        final_recall = session_data.get('final_recall', 0)
        if not (0.0 <= final_recall <= 1.0):
            print(f"WARNING: Invalid final_recall in XLSX export: {final_recall}")
            final_recall = max(0.0, min(1.0, final_recall))
        
        # Brain Health: 0 to 100
        final_brain_health = session_data.get('final_brain_health', 0)
        if not (0.0 <= final_brain_health <= 100.0):
            print(f"WARNING: Invalid final_brain_health in XLSX export: {final_brain_health}")
            final_brain_health = max(0.0, min(100.0, final_brain_health))
        
        # Completion Time: 0 to 180 seconds
        completion_time = session_data.get('completion_time', 0)
        if completion_time < 0 or completion_time > 180:
            print(f"WARNING: Invalid completion_time in XLSX export: {completion_time}")
            completion_time = max(0.0, min(180.0, completion_time))
        
        # Energy: 0 to initial (100)
        final_neural_energy = session_data.get('final_neural_energy', 0)
        if not (0.0 <= final_neural_energy <= 200.0):
            print(f"WARNING: Invalid final_neural_energy in XLSX export: {final_neural_energy}")
            final_neural_energy = max(0.0, min(200.0, final_neural_energy))
        
        # Score: non-negative
        final_score = session_data.get('final_score', 0)
        if final_score < 0:
            print(f"WARNING: Invalid final_score in XLSX export: {final_score}")
            final_score = max(0, final_score)
        
        # Problems Solved: 0 to 7
        events_solved = session_data.get('events_solved', 0)
        if not (0 <= events_solved <= 7):
            print(f"WARNING: Invalid events_solved in XLSX export: {events_solved}")
            events_solved = max(0, min(7, events_solved))
        
        # Validate outcome consistency with accuracy
        result = session_data.get('result', 'manual')
        if result == 'won' and final_accuracy < 0.90:
            print(f"WARNING: Outcome mismatch: result={result} but accuracy={final_accuracy}")
            # Do not auto-correct - let the inconsistency be visible for debugging
        
        # Validate interactions belong to this session
        for interaction in interactions:
            if interaction.get('session_id') != session_id:
                raise HTTPException(status_code=400, detail="Interaction does not belong to this session")

        buffer = BytesIO()
        workbook = xlsxwriter.Workbook(buffer, {'in_memory': True, 'password': '2026'})

        workbook.set_properties({
            'title': 'AI Brain Lab — Session Research Report',
            'subject': 'AI Training Simulation Research Data',
            'author': 'AI Brain Lab Research',
            'category': 'Research Data',
            'comments': 'Password protected research data - Session ID: ' + session_id
        })

        # Professional formats
        title_format = workbook.add_format({
            'bold': True,
            'font_size': 14,
            'font_color': '#0a0e1a',
            'bg_color': '#f1f5f9'
        })
        
        section_header_format = workbook.add_format({
            'bold': True,
            'font_size': 12,
            'font_color': '#0ea5e9',
            'bg_color': '#f8fafc'
        })
        
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#1e293b',
            'font_color': '#ffffff',
            'font_size': 10,
            'border': 1,
            'border_color': '#475569',
            'text_wrap': True
        })
        
        data_format = workbook.add_format({
            'font_size': 10,
            'border': 1,
            'border_color': '#e2e8f0',
            'text_wrap': True
        })
        
        # CRITICAL: Percent format expects decimal (0.5 = 50%), not percentage (50 = 5000%)
        percent_format = workbook.add_format({
            'num_format': '0.0%',
            'font_size': 10,
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        integer_format = workbook.add_format({
            'num_format': '0',
            'font_size': 10,
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        number_format = workbook.add_format({
            'num_format': '0.00',
            'font_size': 10,
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        date_format = workbook.add_format({
            'num_format': 'yyyy-mm-dd hh:mm:ss',
            'font_size': 10,
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        success_format = workbook.add_format({
            'font_size': 10,
            'bg_color': '#d1fae5',
            'font_color': '#065f46',
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        warning_format = workbook.add_format({
            'font_size': 10,
            'bg_color': '#fef3c7',
            'font_color': '#92400e',
            'border': 1,
            'border_color': '#e2e8f0'
        })
        
        error_format = workbook.add_format({
            'font_size': 10,
            'bg_color': '#fee2e2',
            'font_color': '#991b1b',
            'border': 1,
            'border_color': '#e2e8f0'
        })

        # SHEET 1: Research Summary
        summary_sheet = workbook.add_worksheet('Research Summary')
        summary_sheet.set_column('A:A', 25)
        summary_sheet.set_column('B:B', 35)
        summary_sheet.set_column('C:C', 20)
        
        summary_sheet.write('A1', 'AI Brain Lab — Session Research Report', title_format)
        summary_sheet.write('A2', '', data_format)
        
        # Session Information
        summary_sheet.write('A3', 'Session Information', section_header_format)
        summary_sheet.write('A4', 'Participant ID', data_format)
        summary_sheet.write('B4', session_data.get('participant_id'), data_format)
        summary_sheet.write('A5', 'Session ID', data_format)
        summary_sheet.write('B5', session_data.get('session_id'), data_format)
        summary_sheet.write('A6', 'Challenge Type', data_format)
        summary_sheet.write('B6', session_data.get('challenge_type', 'N/A'), data_format)
        summary_sheet.write('A7', 'Challenge Order', data_format)
        summary_sheet.write('B7', session_data.get('challenge_order', 'N/A'), integer_format)
        summary_sheet.write('A8', 'Date', data_format)
        summary_sheet.write('B8', session_data.get('start_time', 'N/A')[:10] if session_data.get('start_time') else 'N/A', data_format)
        summary_sheet.write('A9', 'Start Time', data_format)
        summary_sheet.write('B9', session_data.get('start_time', 'N/A'), date_format)
        summary_sheet.write('A10', 'End Time', data_format)
        summary_sheet.write('B10', session_data.get('end_time', 'N/A'), date_format)
        summary_sheet.write('A11', 'Total Duration (seconds)', data_format)
        summary_sheet.write('B11', completion_time, number_format)

        summary_sheet.write('A12', '', data_format)
        
        # Performance
        summary_sheet.write('A13', 'Performance', section_header_format)
        
        # CRITICAL: Use validated values from above, not session_data directly
        # This ensures XLSX matches Results Screen exactly
        summary_sheet.write('A14', 'Final Accuracy', data_format)
        summary_sheet.write('B14', final_accuracy, percent_format)
        summary_sheet.write('C14', 'Target: 90%', data_format)
        
        # CRITICAL: Brain Health is stored as 0-100 (percentage), convert to decimal for percent_format
        summary_sheet.write('A15', 'Final Brain Health', data_format)
        summary_sheet.write('B15', final_brain_health / 100.0 if final_brain_health > 0 else 0, percent_format)
        
        summary_sheet.write('A16', 'Final Energy', data_format)
        summary_sheet.write('B16', final_neural_energy, integer_format)
        
        summary_sheet.write('A17', 'Final Score', data_format)
        summary_sheet.write('B17', final_score, integer_format)
        
        summary_sheet.write('A18', '', data_format)
        
        # Decision Performance
        summary_sheet.write('A19', 'Decision Performance', section_header_format)
        total_actions = session_data.get('total_actions', 0)
        correct_actions = session_data.get('correct_actions', 0)
        wrong_actions = session_data.get('wrong_actions', 0)
        success_rate = (correct_actions / total_actions * 100) if total_actions > 0 else 0
        
        # CRITICAL: Use validated variables instead of session_data directly
        # This ensures XLSX matches Results Screen exactly
        summary_sheet.write('A20', 'Total Actions', data_format)
        summary_sheet.write('B20', total_actions, integer_format)
        
        summary_sheet.write('A21', 'Correct Actions', data_format)
        summary_sheet.write('B21', correct_actions, integer_format)
        
        summary_sheet.write('A22', 'Incorrect Actions', data_format)
        summary_sheet.write('B22', wrong_actions, integer_format)
        
        summary_sheet.write('A23', 'Success Rate', data_format)
        summary_sheet.write('B23', success_rate / 100, percent_format)
        
        summary_sheet.write('A24', '', data_format)
        
        # Events (mission problem count, not the number of interaction rows —
        # the 1s game-clock polls and navigation rows are not events).
        summary_sheet.write('A25', 'Events', section_header_format)
        total_events = session_data.get('total_events') or 7
        events_ignored = max(0, int(total_events) - int(events_solved))
        event_success_rate = (events_solved / total_events * 100) if total_events > 0 else 0
        
        summary_sheet.write('A26', 'Total Events', data_format)
        summary_sheet.write('B26', total_events, integer_format)
        
        summary_sheet.write('A27', 'Events Solved', data_format)
        summary_sheet.write('B27', events_solved, integer_format)
        
        summary_sheet.write('A28', 'Events Ignored', data_format)
        summary_sheet.write('B28', events_ignored, integer_format)
        
        summary_sheet.write('A29', 'Event Success Rate', data_format)
        summary_sheet.write('B29', event_success_rate / 100, percent_format)
        
        summary_sheet.write('A30', '', data_format)
        
        # Outcome
        summary_sheet.write('A31', 'Outcome', section_header_format)
        # CRITICAL: Use stored backend result, not recalculate from accuracy
        # This ensures XLSX matches Results Screen exactly
        challenge_result = 'Completed' if result == 'won' else 'Failed'
        result_format = success_format if challenge_result == 'Completed' else error_format
        
        summary_sheet.write('A32', 'Challenge Result', data_format)
        summary_sheet.write('B32', challenge_result, result_format)
        
        # Game Mode
        summary_sheet.write('A33', 'Game Mode', data_format)
        summary_sheet.write('B33', session_data.get('game_mode', 'solo').title(), data_format)

        # Mission Level
        summary_sheet.write('A34', 'Mission Level', data_format)
        summary_sheet.write('B34', session_data.get('mission_level', 1) or session_data.get('level', 1), integer_format)
        summary_sheet.write('A35', 'Difficulty', data_format)
        summary_sheet.write('B35', session_data.get('difficulty', session_data.get('challenge_type', 'N/A')), data_format)
        
        summary_sheet.freeze_panes(3, 0)

        # SHEET 2: Challenge Summary
        challenge_sheet = workbook.add_worksheet('Challenge Summary')
        challenge_sheet.set_column('A:A', 15)
        challenge_sheet.set_column('B:B', 12)
        challenge_sheet.set_column('C:C', 8)
        challenge_sheet.set_column('D:L', 14)
        
        challenge_headers = [
            'Challenge', 'Difficulty', 'Order', 'Start Time', 'End Time',
            'Duration (seconds)', 'Starting Accuracy', 'Final Accuracy',
            'Accuracy Change', 'Starting Brain Health', 'Final Brain Health',
            'Brain Health Change', 'Starting Energy', 'Final Energy',
            'Energy Used', 'Score', 'Total Actions', 'Correct Actions',
            'Wrong Actions', 'Success Rate', 'Result'
        ]
        
        for col_index, header in enumerate(challenge_headers):
            challenge_sheet.write(0, col_index, header, header_format)
        
        # Calculate challenge-specific data
        challenge_type = session_data.get('challenge_type', 'N/A')
        challenge_order = session_data.get('challenge_order', 1)
        start_time = session_data.get('start_time', 'N/A')
        end_time = session_data.get('end_time', 'N/A')
        duration = completion_time  # Use validated value
        
        # Get initial state from first interaction
        starting_accuracy = interactions[0].get('accuracy_before', 0) if interactions else 0
        starting_health = interactions[0].get('brain_health_before', 0) if interactions else 0
        starting_energy = interactions[0].get('neural_energy_before', 0) if interactions else 0
        
        accuracy_change = final_accuracy - starting_accuracy
        health_change = final_brain_health - starting_health
        energy_used = starting_energy - final_neural_energy
        
        challenge_success_rate = success_rate / 100
        # CRITICAL: Use stored backend result, not recalculate from accuracy
        challenge_result = 'Completed' if result == 'won' else 'Failed'
        
        challenge_data = [
            challenge_type,
            session_data.get('difficulty', challenge_type),
            challenge_order,
            start_time,
            end_time,
            duration,
            starting_accuracy,
            final_accuracy,
            accuracy_change,
            starting_health,
            final_brain_health,
            health_change,
            starting_energy,
            final_neural_energy,
            energy_used,
            final_score,
            total_actions,
            correct_actions,
            wrong_actions,
            challenge_success_rate,
            challenge_result
        ]
        
        for col_index, value in enumerate(challenge_data):
            if col_index in [6, 7]:  # Accuracy columns - stored as 0.0-1.0
                challenge_sheet.write(1, col_index, value, percent_format)
            elif col_index in [9, 10]:  # Brain Health columns - stored as 0-100, convert to decimal
                challenge_sheet.write(1, col_index, value / 100.0 if value > 0 else 0, percent_format)
            elif col_index in [5, 12, 13, 14, 15, 16, 17, 18]:  # Integer columns
                challenge_sheet.write(1, col_index, value, integer_format)
            elif col_index in [8, 11]:  # Change columns
                challenge_sheet.write(1, col_index, value, number_format)
            elif col_index == 19:  # Success rate
                challenge_sheet.write(1, col_index, value, percent_format)
            elif col_index == 20:  # Result
                cell_format = success_format if value == 'Completed' else error_format
                challenge_sheet.write(1, col_index, value, cell_format)
            else:
                challenge_sheet.write(1, col_index, value, data_format)
        
        challenge_sheet.freeze_panes(1, 0)

        # SHEET 3: Action Log
        action_sheet = workbook.add_worksheet('Action Log')
        action_headers = [
            'Timestamp', 'Challenge', 'Action', 'Problem', 'Action Result',
            'Accuracy Before', 'Accuracy After', 'Accuracy Change',
            'Brain Health Before', 'Brain Health After', 'Energy Before',
            'Energy After', 'Energy Spent', 'Expected Impact',
            'Problem State', 'Role', 'Reaction Time (ms)', 'Decision Time (ms)'
        ]
        
        for col_index, header in enumerate(action_headers):
            action_sheet.write(0, col_index, header, header_format)
            action_sheet.set_column(col_index, col_index, 16)
        
        for row_index, interaction in enumerate(interactions, start=1):
            timestamp = interaction.get('timestamp', 'N/A')
            action_type = interaction.get('action_type', 'N/A')
            event_type = interaction.get('event_type', 'N/A')
            is_success = interaction.get('is_success', 0)
            
            acc_before = interaction.get('accuracy_before', 0)
            acc_after = interaction.get('accuracy_after', 0)
            acc_change = acc_after - acc_before
            
            health_before = interaction.get('brain_health_before', 0)
            health_after = interaction.get('brain_health_after', 0)
            
            energy_before = interaction.get('neural_energy_before', 0)
            energy_after = interaction.get('neural_energy_after', 0)
            energy_spent = interaction.get('energy_spent')
            expected_impact = interaction.get('expected_impact')
            problem_state = interaction.get('problem_state')
            role = interaction.get('role')
            reaction_time = interaction.get('reaction_time')
            decision_time = interaction.get('decision_time')
            
            action_sheet.write(row_index, 0, timestamp, date_format)
            action_sheet.write(row_index, 1, challenge_type, data_format)
            action_sheet.write(row_index, 2, action_type, data_format)
            action_sheet.write(row_index, 3, event_type, data_format)
            action_sheet.write(row_index, 4, 'Success' if is_success == 1 else 'Failed', 
                          success_format if is_success == 1 else error_format)
            # CRITICAL: Accuracy stored as 0.0-1.0, percent_format expects decimal
            action_sheet.write(row_index, 5, acc_before, percent_format)
            action_sheet.write(row_index, 6, acc_after, percent_format)
            action_sheet.write(row_index, 7, acc_change, number_format)
            # CRITICAL: Brain Health stored as 0-100, convert to decimal for percent_format
            action_sheet.write(row_index, 8, health_before / 100.0 if health_before > 0 else 0, percent_format)
            action_sheet.write(row_index, 9, health_after / 100.0 if health_after > 0 else 0, percent_format)
            action_sheet.write(row_index, 10, energy_before, integer_format)
            action_sheet.write(row_index, 11, energy_after, integer_format)
            action_sheet.write(row_index, 12, energy_spent if energy_spent is not None else '', integer_format)
            action_sheet.write(row_index, 13, expected_impact if expected_impact is not None else '', percent_format)
            action_sheet.write(row_index, 14, problem_state if problem_state else 'N/A', data_format)
            action_sheet.write(row_index, 15, role if role else 'N/A', data_format)
            action_sheet.write(row_index, 16, reaction_time if reaction_time is not None else 'N/A', number_format)
            action_sheet.write(row_index, 17, decision_time if decision_time is not None else 'N/A', number_format)
        
        action_sheet.freeze_panes(1, 0)

        # SHEET 4: Event Log
        event_sheet = workbook.add_worksheet('Event Log')
        event_headers = [
            'Timestamp', 'Challenge', 'Event', 'Problem Type', 'Difficulty',
            'Player Response', 'Correct / Incorrect', 'Time to Response',
            'Accuracy Before', 'Accuracy After', 'Brain Health Before',
            'Brain Health After', 'Problem State', 'Role', 'Event Result'
        ]
        
        for col_index, header in enumerate(event_headers):
            event_sheet.write(0, col_index, header, header_format)
            event_sheet.set_column(col_index, col_index, 16)
        
        event_row = 1
        for interaction in interactions:
            event_type = interaction.get('event_type')
            if event_type:  # Only record actual events
                timestamp = interaction.get('timestamp', 'N/A')
                action_type = interaction.get('action_type', 'N/A')
                is_success = interaction.get('is_success', 0)
                event_solved = interaction.get('event_solved', 0)
                reaction_time = interaction.get('reaction_time')
                
                event_sheet.write(event_row, 0, timestamp, date_format)
                event_sheet.write(event_row, 1, challenge_type, data_format)
                event_sheet.write(event_row, 2, event_type, data_format)
                event_sheet.write(event_row, 3, event_type, data_format)
                event_sheet.write(event_row, 4, challenge_type, data_format)
                event_sheet.write(event_row, 5, action_type, data_format)
                event_sheet.write(event_row, 6, 'Correct' if is_success == 1 else 'Incorrect',
                              success_format if is_success == 1 else error_format)
                event_sheet.write(event_row, 7, reaction_time if reaction_time is not None else 'N/A', number_format)
                # CRITICAL: Accuracy stored as 0.0-1.0, percent_format expects decimal
                event_sheet.write(event_row, 8, interaction.get('accuracy_before', 0), percent_format)
                event_sheet.write(event_row, 9, interaction.get('accuracy_after', 0), percent_format)
                # CRITICAL: Brain Health stored as 0-100, convert to decimal for percent_format
                event_sheet.write(event_row, 10, interaction.get('brain_health_before', 0) / 100.0 if interaction.get('brain_health_before', 0) > 0 else 0, percent_format)
                event_sheet.write(event_row, 11, interaction.get('brain_health_after', 0) / 100.0 if interaction.get('brain_health_after', 0) > 0 else 0, percent_format)
                event_sheet.write(event_row, 12, interaction.get('problem_state', 'N/A') or 'N/A', data_format)
                event_sheet.write(event_row, 13, interaction.get('role', 'N/A') or 'N/A', data_format)
                event_sheet.write(event_row, 14, 'Solved' if event_solved == 1 else 'Unsolved',
                              success_format if event_solved == 1 else warning_format)
                event_row += 1
        
        event_sheet.freeze_panes(1, 0)

        # SHEET 5: Research Metrics
        metrics_sheet = workbook.add_worksheet('Research Metrics')
        metrics_sheet.set_column('A:A', 20)
        metrics_sheet.set_column('B:D', 15)
        
        metrics_headers = ['Metric', 'Mean', 'Minimum', 'Maximum']
        for col_index, header in enumerate(metrics_headers):
            metrics_sheet.write(0, col_index, header, header_format)
        
        # Calculate real statistics from actual data
        accuracies = [i.get('accuracy_after', 0) for i in interactions if i.get('accuracy_after') is not None]
        # CRITICAL: Brain Health is stored 0-100, but percent_format expects a
        # decimal (0.5 = 50%). Convert here so the sheet does not show 9500%.
        healths = [i.get('brain_health_after', 0) / 100.0 for i in interactions if i.get('brain_health_after') is not None]
        energies = [i.get('neural_energy_after', 0) for i in interactions if i.get('neural_energy_after') is not None]
        # Interactions record the current LEVEL (1-7), not the running score, so
        # this row is labeled "Level" to keep the figure honest.
        levels = [i.get('level', 0) for i in interactions if i.get('level') is not None]

        metrics_data = [
            ['Accuracy', accuracies, percent_format],
            ['Brain Health', healths, percent_format],
            ['Energy', energies, integer_format],
            ['Level', levels, integer_format]
        ]
        
        row = 1
        for metric_name, values, format_type in metrics_data:
            if values:
                metrics_sheet.write(row, 0, metric_name, data_format)
                metrics_sheet.write(row, 1, sum(values) / len(values), format_type)
                metrics_sheet.write(row, 2, min(values), format_type)
                metrics_sheet.write(row, 3, max(values), format_type)
            row += 1
        
        # Add decision statistics
        metrics_sheet.write(row, 0, 'Correct Decisions', data_format)
        metrics_sheet.write(row, 1, correct_actions, integer_format)
        metrics_sheet.write(row, 2, correct_actions, integer_format)
        metrics_sheet.write(row, 3, correct_actions, integer_format)
        row += 1
        
        metrics_sheet.write(row, 0, 'Incorrect Decisions', data_format)
        metrics_sheet.write(row, 1, wrong_actions, integer_format)
        metrics_sheet.write(row, 2, wrong_actions, integer_format)
        metrics_sheet.write(row, 3, wrong_actions, integer_format)
        row += 1
        
        metrics_sheet.write(row, 0, 'Events Solved', data_format)
        metrics_sheet.write(row, 1, events_solved, integer_format)
        metrics_sheet.write(row, 2, events_solved, integer_format)
        metrics_sheet.write(row, 3, events_solved, integer_format)
        row += 1
        
        metrics_sheet.write(row, 0, 'Events Ignored', data_format)
        metrics_sheet.write(row, 1, events_ignored, integer_format)
        metrics_sheet.write(row, 2, events_ignored, integer_format)
        metrics_sheet.write(row, 3, events_ignored, integer_format)
        row += 1

        # Navigation & team-level outcome statistics
        metrics_sheet.write(row, 0, 'Problems Selected', data_format)
        metrics_sheet.write(row, 1, session_data.get('problems_selected', 0), integer_format)
        row += 1
        metrics_sheet.write(row, 0, 'Problems Skipped', data_format)
        metrics_sheet.write(row, 1, session_data.get('skipped_count', 0), integer_format)
        row += 1
        metrics_sheet.write(row, 0, 'Problems Revisited', data_format)
        metrics_sheet.write(row, 1, session_data.get('revisited_count', 0), integer_format)
        row += 1
        metrics_sheet.write(row, 0, 'Solution Drags', data_format)
        drags = sum(1 for i in interactions if i.get('action_type') == 'solution_dragged')
        metrics_sheet.write(row, 1, drags, integer_format)
        row += 1
        metrics_sheet.write(row, 0, 'Mean Decision Time (ms)', data_format)
        decision_times = [i.get('decision_time') for i in interactions if i.get('decision_time') is not None]
        if decision_times:
            metrics_sheet.write(row, 1, sum(decision_times) / len(decision_times), number_format)
            metrics_sheet.write(row, 2, min(decision_times), number_format)
            metrics_sheet.write(row, 3, max(decision_times), number_format)
        else:
            metrics_sheet.write(row, 1, 'N/A', data_format)
        
        metrics_sheet.freeze_panes(1, 0)

        # SHEET 6: Team Summary (team-level outcome, separated from individual interactions)
        team_sheet = workbook.add_worksheet('Team Summary')
        team_sheet.set_column('A:A', 30)
        team_sheet.set_column('B:B', 40)
        team_sheet.set_column('C:C', 20)

        team_sheet.write('A1', 'Team Summary', title_format)
        team_sheet.write('A2', '', data_format)

        team_mode = session_data.get('team_mode', 0)
        game_mode = session_data.get('game_mode', 'solo')
        team_sheet.write('A3', 'Session Type', section_header_format)
        team_sheet.write('A4', 'Mode', data_format)
        team_sheet.write('B4', 'Team Session' if team_mode else 'Individual Session', data_format)
        team_sheet.write('A5', 'Game Mode', data_format)
        team_sheet.write('B5', game_mode.title() if game_mode else 'Solo', data_format)
        team_sheet.write('A6', 'Team Size', data_format)
        team_sheet.write('B6', session_data.get('team_size', 1), integer_format)

        team_sheet.write('A7', 'Shared Decisions', section_header_format)
        team_sheet.write('A8', 'Roles Used', data_format)
        team_sheet.write('B8', ', '.join(roles_used) if roles_used else 'N/A', data_format)
        team_sheet.write('A9', 'Total Actions', data_format)
        team_sheet.write('B9', total_actions, integer_format)
        team_sheet.write('A10', 'Correct Decisions', data_format)
        team_sheet.write('B10', correct_actions, integer_format)
        team_sheet.write('A11', 'Incorrect Decisions', data_format)
        team_sheet.write('B11', wrong_actions, integer_format)
        team_sheet.write('A12', 'Problems Selected', data_format)
        team_sheet.write('B12', session_data.get('problems_selected', 0), integer_format)
        team_sheet.write('A13', 'Problems Skipped', data_format)
        team_sheet.write('B13', session_data.get('skipped_count', 0), integer_format)
        team_sheet.write('A14', 'Problems Revisited', data_format)
        team_sheet.write('B14', session_data.get('revisited_count', 0), integer_format)

        team_sheet.write('A16', 'Outcome', section_header_format)
        team_sheet.write('A17', 'Final Result', data_format)
        team_sheet.write('B17', result, data_format)
        team_sheet.write('A18', 'Final Accuracy', data_format)
        team_sheet.write('B18', final_accuracy, percent_format)

        # Per-role breakdown (individual interaction data)
        if team_mode and roles_used:
            team_sheet.write('A20', 'Per-Role Activity', section_header_format)
            team_sheet.write(20, 1, 'Actions', header_format)
            team_sheet.write(20, 2, 'Correct', header_format)
            r = 21
            for role_name in roles_used:
                role_actions = [i for i in interactions if i.get('role') == role_name]
                role_correct = sum(1 for i in role_actions if i.get('is_success') == 1)
                team_sheet.write(r, 0, role_name, data_format)
                team_sheet.write(r, 1, len(role_actions), integer_format)
                team_sheet.write(r, 2, role_correct, integer_format)
                r += 1

        team_sheet.freeze_panes(3, 0)

        workbook.close()
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename=ai_brain_lab_session_{session_id}.xlsx'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
