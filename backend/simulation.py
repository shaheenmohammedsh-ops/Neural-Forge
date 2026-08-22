import random
from typing import Dict, List, Literal, Optional
from dataclasses import dataclass, field
from datetime import datetime

AccuracyResult = Literal["CORRECT", "WRONG", "INITIALIZE"]

# Problem states
UNRESOLVED = "UNRESOLVED"
SELECTED = "SELECTED"
IN_PROGRESS = "IN_PROGRESS"
SOLVED = "SOLVED"
SKIPPED = "SKIPPED"

# Human-friendly problem metadata. threat_level 1..5, low -> critical.
# focus describes the decision pattern the problem rewards:
#   speed     -> the correct solution is obvious; fast recognition wins
#   analysis  -> several valid solutions; careful reading is rewarded
#   balance   -> strong vs. cheap solutions trade off energy, time and impact
# scenario is a plain-language category shown to participants.
PROBLEM_META = {
    "Dirty Data": {
        "name": "Dirty Data",
        "description": "Some records are duplicated or inconsistent, so the model learns from unreliable examples.",
        "threat_level": 3,
        "threat_label": "Medium",
        "recommended_solutions": ["clean_dataset", "normalize_data"],
        "focus": "speed",
        "scenario": "Data quality",
    },
    "Missing Values": {
        "name": "Missing Values",
        "description": "Several features are incomplete, so the model cannot use those samples well.",
        "threat_level": 2,
        "threat_label": "Low",
        "recommended_solutions": ["normalize_data"],
        "focus": "speed",
        "scenario": "Data quality",
    },
    "Noise": {
        "name": "Noise",
        "description": "Random measurement errors are hiding the real signal in the data.",
        "threat_level": 2,
        "threat_label": "Low",
        "recommended_solutions": ["remove_noise"],
        "focus": "speed",
        "scenario": "Noise",
    },
    "Class Imbalance": {
        "name": "Class Imbalance",
        "description": "One class dominates the training set, so the model is biased toward the majority.",
        "threat_level": 4,
        "threat_label": "High",
        "recommended_solutions": ["balance_dataset", "collect_more_data"],
        "focus": "balance",
        "scenario": "Class balance",
    },
    "Data Drift": {
        "name": "Data Drift",
        "description": "New incoming data no longer matches what the model was trained on.",
        "threat_level": 4,
        "threat_label": "High",
        "recommended_solutions": ["collect_more_data", "feature_selection"],
        "focus": "analysis",
        "scenario": "Drift",
    },
    "Bias": {
        "name": "Bias",
        "description": "The model shows systematic errors for some groups of predictions.",
        "threat_level": 3,
        "threat_label": "Medium",
        "recommended_solutions": ["tune_hyperparameters"],
        "focus": "speed",
        "scenario": "Bias",
    },
    "Concept Drift": {
        "name": "Concept Drift",
        "description": "The meaning of the target has changed, so the old rules no longer apply.",
        "threat_level": 5,
        "threat_label": "Critical",
        "recommended_solutions": ["feature_selection", "validate_model"],
        "focus": "analysis",
        "scenario": "Drift",
    },
    # --- Model Tuning (Level 2) ---
    "Overfitting": {
        "name": "Overfitting",
        "description": "The model memorizes the training data and performs poorly on new examples.",
        "threat_level": 3,
        "threat_label": "Medium",
        "recommended_solutions": ["regularize_model", "tune_hyperparameters"],
        "focus": "analysis",
        "scenario": "Training",
    },
    "Underfitting": {
        "name": "Underfitting",
        "description": "The model is too simple to capture the real pattern in the data.",
        "threat_level": 3,
        "threat_label": "Medium",
        "recommended_solutions": ["enhance_features", "tune_hyperparameters"],
        "focus": "analysis",
        "scenario": "Training",
    },
    "Feature Overload": {
        "name": "Feature Overload",
        "description": "Too many irrelevant features slow learning down and add noise.",
        "threat_level": 3,
        "threat_label": "Medium",
        "recommended_solutions": ["feature_selection"],
        "focus": "speed",
        "scenario": "Features",
    },
    # --- Advanced AI (Level 3) ---
    "Adversarial Noise": {
        "name": "Adversarial Noise",
        "description": "Small crafted changes trick the model into confident wrong predictions.",
        "threat_level": 4,
        "threat_label": "High",
        "recommended_solutions": ["harden_model", "validate_model"],
        "focus": "balance",
        "scenario": "Adversarial",
    },
    "Edge Cases": {
        "name": "Edge Cases",
        "description": "Rare but important examples are mishandled by the model.",
        "threat_level": 4,
        "threat_label": "High",
        "recommended_solutions": ["stress_test_model", "collect_more_data"],
        "focus": "analysis",
        "scenario": "Reliability",
    },
    "Silent Data Corruption": {
        "name": "Silent Data Corruption",
        "description": "A pipeline bug is quietly corrupting new incoming data.",
        "threat_level": 4,
        "threat_label": "High",
        "recommended_solutions": ["data_audit", "clean_dataset"],
        "focus": "analysis",
        "scenario": "Data quality",
    },
    "Model Drift in Production": {
        "name": "Model Drift in Production",
        "description": "The live model's accuracy is slowly dropping without anyone noticing.",
        "threat_level": 5,
        "threat_label": "Critical",
        "recommended_solutions": ["monitor_model", "retrain_model"],
        "focus": "balance",
        "scenario": "Deployment",
    },
    # --- High-Risk AI (Level 4) ---
    "Deployment Risk": {
        "name": "Deployment Risk",
        "description": "Rolling out the new model now could break the live service.",
        "threat_level": 5,
        "threat_label": "Critical",
        "recommended_solutions": ["staged_rollout", "validate_model"],
        "focus": "balance",
        "scenario": "Deployment",
    },
    "Feedback Loop": {
        "name": "Feedback Loop",
        "description": "The model's own predictions are shaping future data and amplifying bias.",
        "threat_level": 5,
        "threat_label": "Critical",
        "recommended_solutions": ["monitor_model", "retrain_model"],
        "focus": "analysis",
        "scenario": "Deployment",
    },
}

# Human-friendly solution metadata. energy_cost must match action_effects.
SOLUTION_META = {
    "clean_dataset": {
        "id": "clean_dataset",
        "name": "Clean Dataset",
        "description": "Remove duplicate and inconsistent records so the model learns from reliable examples.",
        "energy_cost": 15,
        "time_cost": 2,
        "expected_impact": 0.08,
        "risk": "May also remove a few rare but useful examples.",
        "valid_targets": ["Dirty Data"],
        "educational": "Real teams spend most of their time cleaning data; consistent input is the foundation of reliable predictions.",
    },
    "normalize_data": {
        "id": "normalize_data",
        "name": "Normalize Data",
        "description": "Scale all features to a consistent range so no single feature dominates.",
        "energy_cost": 10,
        "time_cost": 1,
        "expected_impact": 0.05,
        "risk": "Low risk; a safe first step for most datasets.",
        "valid_targets": ["Dirty Data", "Missing Values"],
        "educational": "Normalization keeps features comparable so training stays stable.",
    },
    "remove_noise": {
        "id": "remove_noise",
        "name": "Remove Noise",
        "description": "Filter out random measurement errors that confuse the model.",
        "energy_cost": 12,
        "time_cost": 2,
        "expected_impact": 0.06,
        "risk": "Filtering too aggressively can remove real signal.",
        "valid_targets": ["Noise"],
        "educational": "Denoising improves the signal-to-noise ratio the model can learn from.",
    },
    "balance_dataset": {
        "id": "balance_dataset",
        "name": "Balance Dataset",
        "description": "Equalize class representation so the model does not favor the majority class.",
        "energy_cost": 18,
        "time_cost": 3,
        "expected_impact": 0.09,
        "risk": "Reduces the total number of training samples.",
        "valid_targets": ["Class Imbalance"],
        "educational": "Balanced classes prevent models from shortcutting to majority predictions.",
    },
    "collect_more_data": {
        "id": "collect_more_data",
        "name": "Collect More Data",
        "description": "Gather additional samples, especially for under-represented groups.",
        "energy_cost": 25,
        "time_cost": 4,
        "expected_impact": 0.12,
        "risk": "Costly and slow; adds energy pressure.",
        "valid_targets": ["Class Imbalance", "Data Drift"],
        "educational": "More diverse data helps models stay robust to changing conditions.",
    },
    "feature_selection": {
        "id": "feature_selection",
        "name": "Feature Selection",
        "description": "Keep the most informative features and drop ones that change unpredictably.",
        "energy_cost": 20,
        "time_cost": 3,
        "expected_impact": 0.10,
        "risk": "Choosing the wrong features can hide important signals.",
        "valid_targets": ["Data Drift", "Concept Drift"],
        "educational": "Stable features keep predictions reliable even as the world changes.",
    },
    "tune_hyperparameters": {
        "id": "tune_hyperparameters",
        "name": "Tune Hyperparameters",
        "description": "Adjust learning rate and regularization to reduce systematic errors.",
        "energy_cost": 22,
        "time_cost": 3,
        "expected_impact": 0.11,
        "risk": "Can overfit to the validation set if tuned for too long.",
        "valid_targets": ["Bias"],
        "educational": "Regularization helps the model avoid relying on biased patterns.",
    },
    "validate_model": {
        "id": "validate_model",
        "name": "Validate Model",
        "description": "Check performance on data the model has never seen before.",
        "energy_cost": 8,
        "time_cost": 1,
        "expected_impact": 0.03,
        "risk": "Low risk; reveals real performance without changing training.",
        "valid_targets": ["Concept Drift", "Edge Cases", "Deployment Risk", "Adversarial Noise"],
        "educational": "Continuous validation catches performance drops before they reach users.",
    },
    "regularize_model": {
        "id": "regularize_model",
        "name": "Regularize Model",
        "description": "Add regularization so the model generalizes instead of memorizing.",
        "energy_cost": 20,
        "time_cost": 3,
        "expected_impact": 0.11,
        "risk": "Too much regularization can push the model toward underfitting.",
        "valid_targets": ["Overfitting", "Bias"],
        "educational": "Regularization trades a little training accuracy for much better generalization.",
    },
    "enhance_features": {
        "id": "enhance_features",
        "name": "Add Features",
        "description": "Give the model more informative input so it can capture the pattern.",
        "energy_cost": 18,
        "time_cost": 2,
        "expected_impact": 0.09,
        "risk": "Adding the wrong features can add noise instead of signal.",
        "valid_targets": ["Underfitting"],
        "educational": "A too-simple model benefits from more meaningful input signals.",
    },
    "harden_model": {
        "id": "harden_model",
        "name": "Harden Model",
        "description": "Train the model to resist small crafted input changes.",
        "energy_cost": 28,
        "time_cost": 4,
        "expected_impact": 0.13,
        "risk": "Costly and slows training; uses significant energy.",
        "valid_targets": ["Adversarial Noise", "Edge Cases"],
        "educational": "Adversarial training makes models robust to deliberate input manipulation.",
    },
    "stress_test_model": {
        "id": "stress_test_model",
        "name": "Stress Test",
        "description": "Probe rare and unusual cases before releasing the model.",
        "energy_cost": 15,
        "time_cost": 2,
        "expected_impact": 0.08,
        "risk": "Reveals problems but does not fix them by itself.",
        "valid_targets": ["Edge Cases", "Deployment Risk"],
        "educational": "Edge-case testing prevents rare but costly failures in the real world.",
    },
    "monitor_model": {
        "id": "monitor_model",
        "name": "Monitor Model",
        "description": "Track live model performance so problems are caught early.",
        "energy_cost": 10,
        "time_cost": 1,
        "expected_impact": 0.05,
        "risk": "Low risk; detects drift but does not change the model.",
        "valid_targets": ["Model Drift in Production", "Feedback Loop"],
        "educational": "Monitoring turns silent performance decay into an early warning.",
    },
    "retrain_model": {
        "id": "retrain_model",
        "name": "Retrain Model",
        "description": "Refresh the model on the latest data to recover its accuracy.",
        "energy_cost": 24,
        "time_cost": 3,
        "expected_impact": 0.11,
        "risk": "Uses energy and time; needs clean, representative data.",
        "valid_targets": ["Model Drift in Production", "Feedback Loop", "Data Drift"],
        "educational": "Retraining on fresh data keeps deployed models aligned with reality.",
    },
    "staged_rollout": {
        "id": "staged_rollout",
        "name": "Staged Rollout",
        "description": "Deploy the new model gradually behind guardrails and monitor it.",
        "energy_cost": 16,
        "time_cost": 2,
        "expected_impact": 0.07,
        "risk": "Slower to ship, but limits the blast radius of a bad release.",
        "valid_targets": ["Deployment Risk"],
        "educational": "Gradual rollouts let teams catch problems before a full release.",
    },
    "data_audit": {
        "id": "data_audit",
        "name": "Data Audit",
        "description": "Inspect the pipeline for silent corruption of incoming data.",
        "energy_cost": 12,
        "time_cost": 1,
        "expected_impact": 0.06,
        "risk": "Low risk; identifies the problem so it can be fixed.",
        "valid_targets": ["Silent Data Corruption"],
        "educational": "Auditing data pipelines prevents silent quality erosion over time.",
    },
}

SOLUTION_ORDER = [
    "clean_dataset",
    "normalize_data",
    "remove_noise",
    "balance_dataset",
    "collect_more_data",
    "feature_selection",
    "tune_hyperparameters",
    "validate_model",
    "regularize_model",
    "enhance_features",
    "harden_model",
    "stress_test_model",
    "monitor_model",
    "retrain_model",
    "staged_rollout",
    "data_audit",
]

# Per-problem difficulty (drives accuracy rewards). Every level's problem set
# sums to roughly the same total (2.1-2.45) so all missions require a consistent
# ~6-7 correct solves to reach 90%. Difficulty therefore comes from decision
# complexity (overlapping valid solutions, energy/impact trade-offs, risk), not
# from bigger numbers.
EVENT_DIFFICULTY = {
    "Dirty Data": 0.15,
    "Missing Values": 0.20,
    "Noise": 0.25,
    "Class Imbalance": 0.30,
    "Data Drift": 0.35,
    "Bias": 0.40,
    "Concept Drift": 0.45,
    "Overfitting": 0.24,
    "Underfitting": 0.24,
    "Feature Overload": 0.28,
    "Adversarial Noise": 0.34,
    "Edge Cases": 0.32,
    "Silent Data Corruption": 0.30,
    "Model Drift in Production": 0.36,
    "Deployment Risk": 0.30,
    "Feedback Loop": 0.38,
}

# Level configs. Each level is a 7-problem mission drawn from the pool above.
# Difficulty rises through decision complexity (overlapping valid solutions,
# energy/impact trade-offs, risk balance), NOT through bigger penalties or
# faster energy drain.
LEVELS = [
    {
        "level": 1,
        "title": "Foundation",
        "subtitle": "Clean data, solid basics",
        "description": "Establish the fundamentals of a reliable AI pipeline. Problems are clearly signposted and each has an obvious solution.",
        "difficulty": "Introductory",
        "target_accuracy": 0.90,
        "duration": 180,
        "problems": [
            "Dirty Data", "Missing Values", "Noise", "Class Imbalance",
            "Data Drift", "Bias", "Concept Drift",
        ],
        "solo_guide": "Learn the core loop: inspect a problem, preview a solution, then apply it. Early problems reward fast recognition.",
        "team_guide": "Start with any role. Each role tags its decisions, so everyone can see who handled what.",
    },
    {
        "level": 2,
        "title": "Model Tuning",
        "subtitle": "Train smarter, not harder",
        "description": "The model is learning poorly. Diagnose overfitting, underfitting and feature overload, and balance several valid options against your energy.",
        "difficulty": "Moderate",
        "target_accuracy": 0.90,
        "duration": 180,
        "problems": [
            "Overfitting", "Underfitting", "Feature Overload", "Bias",
            "Noise", "Class Imbalance", "Concept Drift",
        ],
        "solo_guide": "Several problems now have more than one valid solution. Read the trade-offs before spending energy.",
        "team_guide": "Divide the work: one role can own diagnosis, another can own the solution. Compare previews before confirming.",
    },
    {
        "level": 3,
        "title": "Advanced AI",
        "subtitle": "Reliable under pressure",
        "description": "The stakes rise: adversarial inputs, silent corruption and production drift demand careful analysis and risk-aware choices.",
        "difficulty": "Advanced",
        "target_accuracy": 0.90,
        "duration": 180,
        "problems": [
            "Adversarial Noise", "Edge Cases", "Silent Data Corruption",
            "Data Drift", "Model Drift in Production", "Overfitting", "Feature Overload",
        ],
        "solo_guide": "Strong solutions cost more energy. Choose which reliability problems to solve and which to defer.",
        "team_guide": "Strong coordination pays off: let one role verify (validate / stress-test) while another commits the expensive fixes.",
    },
    {
        "level": 4,
        "title": "High-Risk AI",
        "subtitle": "Decisions under stakes",
        "description": "Deployment risks, feedback loops and adversarial threats collide. Every card is valid somewhere, so precision and prioritization decide the mission.",
        "difficulty": "Expert",
        "target_accuracy": 0.90,
        "duration": 180,
        "problems": [
            "Deployment Risk", "Feedback Loop", "Model Drift in Production",
            "Adversarial Noise", "Silent Data Corruption", "Concept Drift", "Edge Cases",
        ],
        "solo_guide": "No easy answers. Preview every card, watch your energy, and spend on the problems that move accuracy most.",
        "team_guide": "A true team decision: assign roles to coverage, review previews as a group, and confirm together before committing energy.",
    },
]


@dataclass
class SimulationState:
    accuracy: float
    loss: float
    precision: float
    recall: float
    brain_health: float
    neural_energy: float
    current_event: Optional[str]
    active_events: list
    problem_states: dict
    events_solved: int
    total_events: int
    current_level: int
    time_remaining: int
    score: int
    combo: int
    game_status: str
    end_reason: Optional[str] = None
    outcome: Optional[str] = None
    session_start_time: Optional[datetime] = None
    max_time: int = 180
    problems: list = field(default_factory=list)
    solutions: list = field(default_factory=list)
    last_result: Optional[str] = None
    last_message: Optional[str] = None
    last_problem: Optional[str] = None
    last_action: Optional[str] = None
    team_mode: bool = False
    team_size: int = 1
    game_mode: str = 'solo'
    active_role: Optional[str] = None
    mission_level: int = 1
    mission_title: Optional[str] = None
    mission_subtitle: Optional[str] = None
    difficulty: Optional[str] = None


# Deterministic, research-safe team role advantages (Team Mode only).
# Each bonus is small (<= 5%) and applied ONLY when an active role is set.
# Solo Mode never sets a role, so its maths are unchanged.
# reward_multiplier applies to the accuracy reward of a correct solution.
# penalty_multiplier applies to the accuracy penalty of an incorrect solution.
ROLE_BONUS = {
    "Data Analyst": {"reward_multiplier": 1.05, "penalty_multiplier": 1.0},
    "ML Engineer": {"reward_multiplier": 1.05, "penalty_multiplier": 1.0},
    "Security Analyst": {"reward_multiplier": 1.0, "penalty_multiplier": 0.95},
    "Team Lead": {"reward_multiplier": 1.03, "penalty_multiplier": 1.0},
}


class NeuralSimulation:
    def __init__(self):
        self.base_accuracy = 0.5
        self.base_loss = 1.0
        self.base_precision = 0.5
        self.base_recall = 0.5
        self.base_brain_health = 100.0
        self.base_neural_energy = 160.0

        self.event_types = list(PROBLEM_META.keys())
        self.event_difficulty = dict(EVENT_DIFFICULTY)

        self.action_effects = {
            "clean_dataset": {"energy_cost": 15, "time_cost": 2, "accuracy_reward": 0.08, "energy_bonus": 0},
            "normalize_data": {"energy_cost": 10, "time_cost": 1, "accuracy_reward": 0.05, "energy_bonus": 5},
            "feature_selection": {"energy_cost": 20, "time_cost": 3, "accuracy_reward": 0.10, "energy_bonus": -5},
            "collect_more_data": {"energy_cost": 25, "time_cost": 4, "accuracy_reward": 0.12, "energy_bonus": 10},
            "remove_noise": {"energy_cost": 12, "time_cost": 2, "accuracy_reward": 0.06, "energy_bonus": 0},
            "balance_dataset": {"energy_cost": 18, "time_cost": 3, "accuracy_reward": 0.09, "energy_bonus": -3},
            "tune_hyperparameters": {"energy_cost": 22, "time_cost": 3, "accuracy_reward": 0.11, "energy_bonus": -8},
            "validate_model": {"energy_cost": 8, "time_cost": 1, "accuracy_reward": 0.03, "energy_bonus": 3},
            "regularize_model": {"energy_cost": 20, "time_cost": 3, "accuracy_reward": 0.11, "energy_bonus": -8},
            "enhance_features": {"energy_cost": 18, "time_cost": 2, "accuracy_reward": 0.09, "energy_bonus": -3},
            "harden_model": {"energy_cost": 28, "time_cost": 4, "accuracy_reward": 0.13, "energy_bonus": -12},
            "stress_test_model": {"energy_cost": 15, "time_cost": 2, "accuracy_reward": 0.08, "energy_bonus": 0},
            "monitor_model": {"energy_cost": 10, "time_cost": 1, "accuracy_reward": 0.05, "energy_bonus": 5},
            "retrain_model": {"energy_cost": 24, "time_cost": 3, "accuracy_reward": 0.11, "energy_bonus": 8},
            "staged_rollout": {"energy_cost": 16, "time_cost": 2, "accuracy_reward": 0.07, "energy_bonus": 2},
            "data_audit": {"energy_cost": 12, "time_cost": 1, "accuracy_reward": 0.06, "energy_bonus": 3},
        }

        self.nodes = {
            "Input_Layer": {"energy": 30, "max_energy": 36, "importance": 0.2},
            "Hidden_1": {"energy": 40, "max_energy": 48, "importance": 0.25},
            "Hidden_2": {"energy": 40, "max_energy": 48, "importance": 0.25},
            "Hidden_3": {"energy": 30, "max_energy": 36, "importance": 0.2},
            "Output_Layer": {"energy": 20, "max_energy": 24, "importance": 0.1},
        }

        self.current_event = None
        self.active_events = []
        self.problem_states = {}
        self.attempted_problems = set()
        self.events_solved = 0
        self.target_events = 7
        self.event_queue = []
        self.session_seed = None
        self.session_start_time = None

        # Game mechanics
        self.current_level = 1
        self.time_remaining = 180
        self.score = 0
        self.combo = 0
        self.game_status = "playing"
        self.outcome = None
        self.end_reason = None
        self.max_time = 180
        self.event_timer = 0
        self.event_interval = 15
        self.team_mode = False
        self.team_size = 1
        self.game_mode = 'solo'
        self.active_role = None
        self.mission_level = 1
        self.mission_title = None
        self.mission_subtitle = None
        self.difficulty = None

        # Last action feedback (frontend shows messages based on this)
        self.last_result = None
        self.last_message = None
        self.last_problem = None
        self.last_action = None

    @staticmethod
    def level_config_for(level: int) -> dict:
        """Return the level config dict for a mission level (1-4)."""
        idx = int(level) - 1
        if 0 <= idx < len(LEVELS):
            return LEVELS[idx]
        return LEVELS[0]

    def initialize_session(self, session_id: str, team_mode: bool = False, team_size: int = 1, game_mode: str = 'solo', level: int = 1) -> SimulationState:
        self.session_seed = hash(session_id)
        random.seed(self.session_seed)

        self.session_start_time = datetime.now()
        self.team_mode = team_mode
        self.team_size = max(1, int(team_size))
        self.game_mode = game_mode if game_mode in ('solo', 'team') else 'solo'
        self.active_role = None

        # Load the mission level config (1-4). Level 1 is the default.
        self.mission_level = int(level) if int(level) in range(1, len(LEVELS) + 1) else 1
        level_cfg = LEVELS[self.mission_level - 1]
        self.mission_title = level_cfg["title"]
        self.mission_subtitle = level_cfg.get("subtitle")
        self.difficulty = level_cfg.get("difficulty")

        self._update_accuracy("INITIALIZE")
        self.base_loss = 1.0
        self.base_precision = 0.5
        self.base_recall = 0.5
        self.base_brain_health = 100.0
        self.base_neural_energy = 160.0

        self.nodes = {
            "Input_Layer": {"energy": 30, "max_energy": 36, "importance": 0.2},
            "Hidden_1": {"energy": 40, "max_energy": 48, "importance": 0.25},
            "Hidden_2": {"energy": 40, "max_energy": 48, "importance": 0.25},
            "Hidden_3": {"energy": 30, "max_energy": 36, "importance": 0.2},
            "Output_Layer": {"energy": 20, "max_energy": 24, "importance": 0.1},
        }

        # Active problems come from the level config (always 7 for research parity).
        level_problems = [p for p in level_cfg.get("problems", []) if p in PROBLEM_META]
        while len(level_problems) < 7:
            level_problems.append("Dirty Data")
        level_problems = level_problems[:7]

        self.event_queue = level_problems.copy()
        random.shuffle(self.event_queue)

        self.active_events = []
        self.problem_states = {}
        for _ in range(min(7, len(self.event_queue))):
            if self.event_queue:
                problem = self.event_queue.pop(0)
                self.active_events.append(problem)
                self.problem_states[problem] = UNRESOLVED

        self.current_event = self.active_events[0] if self.active_events else None
        self.events_solved = 0
        self.attempted_problems = set()

        self.current_level = 1
        self.time_remaining = self.max_time
        self.score = 0
        self.combo = 0
        self.game_status = "playing"
        self.outcome = None
        self.end_reason = None
        self.event_timer = 0
        self.last_result = None
        self.last_message = None
        self.last_problem = None
        self.last_action = None

        self._update_accuracy("INITIALIZE")
        self.base_loss = 1.0
        self.base_precision = 0.5
        self.base_recall = 0.5
        self.base_brain_health = 100.0

        return self.get_current_state()

    def _update_accuracy(self, result: AccuracyResult, amount: float = 0.0) -> None:
        """
        Authoritative function for Accuracy changes during gameplay.
        ONLY this function may modify base_accuracy after initialization.

        CORRECT  -> apply reward (amount > 0)
        WRONG    -> apply penalty (amount > 0)
        INITIALIZE -> reset to starting value (0.5)
        Anything else -> unchanged
        """
        if result == "INITIALIZE":
            self.base_accuracy = 0.5
            return

        if result == "CORRECT" and amount > 0:
            self.base_accuracy = max(0.0, min(1.0, self.base_accuracy + amount))
        elif result == "WRONG" and amount > 0:
            self.base_accuracy = max(0.0, min(1.0, self.base_accuracy - amount))

    def _calculate_correct_reward(self, action_type: str, event: str) -> float:
        """Base accuracy reward for solving `event` with `action_type`.

        The event term (difficulty * 0.20) is the dominant driver and is tuned so
        that solving all 7 problems correctly adds ~+0.46 accuracy (0.50 -> ~0.96),
        while solving only 1-2 problems stays far below the 90% target. The action
        term is a small bonus for using a stronger solution card. Team role
        multipliers stay small (<= 5%) and apply only when a role is active.
        """
        action_reward = self.action_effects.get(action_type, {}).get("accuracy_reward", 0.0)
        event_term = self.event_difficulty.get(event, 0.3) * 0.20
        reward = event_term + action_reward * 0.08
        multiplier = ROLE_BONUS.get(self.active_role or "", {}).get("reward_multiplier", 1.0)
        return round(reward * multiplier, 4)

    def _base_solve_reward(self, event: str) -> float:
        """Neutral (no role) reward for solving `event` with its best solution."""
        meta = PROBLEM_META.get(event, {})
        recommended = meta.get("recommended_solutions") or []
        if not recommended:
            return round(self.event_difficulty.get(event, 0.3) * 0.20, 4)
        action_reward = self.action_effects.get(recommended[0], {}).get("accuracy_reward", 0.0)
        return round(self.event_difficulty.get(event, 0.3) * 0.20 + action_reward * 0.08, 4)

    def _calculate_wrong_penalty(self, event: Optional[str]) -> float:
        event_difficulty = self.event_difficulty.get(event, 0.3) if event else 0.3
        multiplier = ROLE_BONUS.get(self.active_role or "", {}).get("penalty_multiplier", 1.0)
        return round(event_difficulty * 0.5 * 0.3 * multiplier, 4)

    def _validate_metric(self, value: float, min_val: float, max_val: float, metric_name: str) -> float:
        if value < min_val or value > max_val:
            print(f"WARNING: {metric_name} out of range: {value}. Clamping to [{min_val}, {max_val}]")
        return max(min_val, min(max_val, value))

    # ------------------------------------------------------------------
    # Problem metadata helpers
    # ------------------------------------------------------------------
    def get_problems(self) -> List[Dict]:
        problems = []
        for problem in self.active_events:
            meta = PROBLEM_META.get(problem, {"name": problem, "description": "", "threat_level": 3,
                                              "threat_label": "Medium", "recommended_solutions": []})
            problems.append({
                "id": problem,
                "name": meta["name"],
                "description": meta["description"],
                "threat_level": meta["threat_level"],
                "threat_label": meta["threat_label"],
                "state": self.problem_states.get(problem, UNRESOLVED),
                "expected_impact": self._base_solve_reward(problem),
                "recommended_solutions": meta["recommended_solutions"],
                "focus": meta.get("focus", "analysis"),
                "scenario": meta.get("scenario", "AI challenge"),
            })
        return problems

    def get_solutions(self) -> List[Dict]:
        # Show only the cards that can address problems in this level's mission.
        active = set(self.active_events)
        relevant = [
            action_id for action_id in SOLUTION_ORDER
            if action_id in SOLUTION_META
            and any(target in active for target in SOLUTION_META[action_id].get("valid_targets", []))
        ]
        return [dict(SOLUTION_META[action_id]) for action_id in relevant]

    def preview_action(self, action_type: str, target_event: str) -> Dict:
        """Return the cost/benefit/risk of a candidate solution without committing."""
        action = self.action_effects.get(action_type)
        if not action:
            return {"valid": False, "error": "Unknown action"}
        if target_event not in self.active_events:
            return {"valid": False, "error": "Unknown problem"}

        solved = self.problem_states.get(target_event) == SOLVED
        valid = not solved and self._action_solves_event(action_type, target_event)
        expected_impact = self._calculate_correct_reward(action_type, target_event) if valid else None

        return {
            "valid": valid,
            "action_type": action_type,
            "action_name": SOLUTION_META.get(action_type, {}).get("name", action_type),
            "problem": target_event,
            "problem_name": PROBLEM_META.get(target_event, {}).get("name", target_event),
            "energy_cost": action["energy_cost"],
            "time_cost": action["time_cost"],
            "expected_impact": expected_impact,
            "risk": SOLUTION_META.get(action_type, {}).get("risk", ""),
            "educational": SOLUTION_META.get(action_type, {}).get("educational", ""),
            "energy_affordable": self._total_energy() >= action["energy_cost"],
            "already_solved": solved,
        }

    def _total_energy(self) -> float:
        return sum(node["energy"] for node in self.nodes.values())

    def get_current_state(self) -> SimulationState:
        accuracy = max(0.0, min(1.0, self.base_accuracy))
        loss = max(0.0, self.base_loss)
        precision = max(0.0, min(1.0, self.base_precision))
        recall = max(0.0, min(1.0, self.base_recall))
        brain_health = max(0.0, min(100.0, self.base_brain_health))
        neural_energy = self._total_energy()

        self._check_game_conditions(accuracy, brain_health, neural_energy)

        return SimulationState(
            accuracy=round(accuracy, 3),
            loss=round(loss, 3),
            precision=round(precision, 3),
            recall=round(recall, 3),
            brain_health=round(brain_health, 3),
            neural_energy=round(neural_energy, 3),
            current_event=self.current_event,
            active_events=self.active_events,
            problem_states=dict(self.problem_states),
            events_solved=self.events_solved,
            total_events=self.target_events,
            current_level=self.current_level,
            time_remaining=self.time_remaining,
            score=self.score,
            combo=self.combo,
            game_status=self.game_status,
            end_reason=self.end_reason,
            outcome=self.outcome,
            session_start_time=self.session_start_time,
            max_time=self.max_time,
            problems=self.get_problems(),
            solutions=self.get_solutions(),
            last_result=self.last_result,
            last_message=self.last_message,
            last_problem=self.last_problem,
            last_action=self.last_action,
            team_mode=self.team_mode,
            team_size=self.team_size,
            game_mode=self.game_mode,
            active_role=self.active_role,
            mission_level=self.mission_level,
            mission_title=self.mission_title,
            mission_subtitle=self.mission_subtitle,
            difficulty=self.difficulty,
        )

    def _check_game_conditions(self, accuracy: float, brain_health: float, neural_energy: float):
        if self.game_status != "playing":
            return

        if accuracy >= 0.90:
            self.game_status = "won"
            self.end_reason = "target_reached"
            self.outcome = "won"
            self.score += int(brain_health * 10) + int(neural_energy * 5)
            return

        if self.time_remaining <= 0:
            self.game_status = "lost"
            self.end_reason = "time_expired"
            self.outcome = "timeout"
            return

        if neural_energy <= 0:
            self.game_status = "lost"
            self.end_reason = "energy_depleted"
            self.outcome = "energy_depleted"
            return

    # ------------------------------------------------------------------
    # Navigation (never changes metrics)
    # ------------------------------------------------------------------
    def select_problem(self, problem_id: str) -> SimulationState:
        if problem_id not in self.active_events:
            return self.get_current_state()
        if self.problem_states.get(problem_id) == SOLVED:
            return self.get_current_state()
        if self.game_status != "playing":
            return self.get_current_state()

        # Only one problem is SELECTED at a time. A previously selected problem
        # returns to its prior state (attempted -> IN_PROGRESS, else UNRESOLVED).
        for problem in self.active_events:
            if problem != problem_id and self.problem_states.get(problem) == SELECTED:
                self.problem_states[problem] = IN_PROGRESS if problem in self.attempted_problems else UNRESOLVED

        self.problem_states[problem_id] = SELECTED
        self.current_event = problem_id
        return self.get_current_state()

    def skip_problem(self, problem_id: str) -> SimulationState:
        if problem_id not in self.active_events:
            return self.get_current_state()
        if self.problem_states.get(problem_id) in (SOLVED, SKIPPED):
            return self.get_current_state()
        if self.game_status != "playing":
            return self.get_current_state()

        self.problem_states[problem_id] = SKIPPED
        if self.current_event == problem_id:
            self.current_event = self._next_unsolved()
        return self.get_current_state()

    def revisit_problem(self, problem_id: str) -> SimulationState:
        if problem_id not in self.active_events:
            return self.get_current_state()
        if self.problem_states.get(problem_id) == SOLVED:
            return self.get_current_state()
        if self.game_status != "playing":
            return self.get_current_state()

        for problem in self.active_events:
            if problem != problem_id and self.problem_states.get(problem) == SELECTED:
                self.problem_states[problem] = IN_PROGRESS if problem in self.attempted_problems else UNRESOLVED
        self.problem_states[problem_id] = SELECTED
        self.current_event = problem_id
        return self.get_current_state()

    def _next_unsolved(self, exclude: Optional[str] = None) -> Optional[str]:
        for problem in self.active_events:
            if problem == exclude:
                continue
            if self.problem_states.get(problem) in (UNRESOLVED, IN_PROGRESS, SELECTED):
                return problem
        return None

    # ------------------------------------------------------------------
    # Resource actions (legacy, kept for compatibility and depth)
    # ------------------------------------------------------------------
    def allocate_energy(self, node_id: str, amount: float) -> SimulationState:
        if node_id not in self.nodes:
            return self.get_current_state()

        node = self.nodes[node_id]
        actual_amount = min(amount, node["max_energy"] - node["energy"])
        if actual_amount <= 0:
            return self.get_current_state()
        node["energy"] = min(node["max_energy"], node["energy"] + actual_amount)

        total_energy = self._total_energy()
        max_total = sum(n["max_energy"] for n in self.nodes.values())
        energy_ratio = total_energy / max_total if max_total else 0

        improvement = energy_ratio * 0.1
        self.base_loss = max(0.1, self.base_loss - improvement * 0.3)
        self.base_precision = min(0.95, self.base_precision + improvement * 0.4)
        self.base_recall = min(0.95, self.base_recall + improvement * 0.4)
        self.base_brain_health = min(100.0, self.base_brain_health + improvement * 10)

        return self.get_current_state()

    def connect_nodes(self, source_id: str, target_id: str) -> SimulationState:
        if source_id not in self.nodes or target_id not in self.nodes:
            return self.get_current_state()

        connection_bonus = 0.05
        self.base_loss = max(0.1, self.base_loss - connection_bonus * 0.2)
        self.base_precision = min(0.95, self.base_precision + connection_bonus * 0.25)
        self.base_recall = min(0.95, self.base_recall + connection_bonus * 0.25)

        return self.get_current_state()

    def disconnect_nodes(self, source_id: str, target_id: str) -> SimulationState:
        if source_id not in self.nodes or target_id not in self.nodes:
            return self.get_current_state()

        penalty = 0.03
        self.base_loss = min(1.5, self.base_loss + penalty * 0.2)
        self.base_precision = max(0.4, self.base_precision - penalty * 0.25)
        self.base_recall = max(0.4, self.base_recall - penalty * 0.25)

        return self.get_current_state()

    def solve_event(self) -> SimulationState:
        if not self.current_event:
            return self.get_current_state()

        event_difficulty = self.event_difficulty.get(self.current_event, 0.3)
        total_energy = self._total_energy()
        max_total = sum(n["max_energy"] for n in self.nodes.values())
        energy_ratio = total_energy / max_total if max_total else 0

        if energy_ratio > 0.6:
            self.events_solved += 1
            reward = event_difficulty * 1.5
            self._update_accuracy("CORRECT", reward * 0.4)
            self.base_loss = max(0.1, self.base_loss - reward * 0.5)
            self.base_precision = min(0.95, self.base_precision + reward * 0.35)
            self.base_recall = min(0.95, self.base_recall + reward * 0.35)
            self.base_brain_health = min(100.0, self.base_brain_health + reward * 20)
            self.current_event = self.event_queue.pop(0) if self.event_queue else None
        else:
            penalty = event_difficulty * 0.5
            self._update_accuracy("WRONG", penalty * 0.3)
            self.base_loss = min(2.0, self.base_loss + penalty * 0.4)
            self.base_brain_health = max(0.0, self.base_brain_health - penalty * 15)

        return self.get_current_state()

    def inspect_node(self, node_id: str) -> Dict:
        if node_id not in self.nodes:
            return {}

        node = self.nodes[node_id]
        return {
            "id": node_id,
            "energy": node["energy"],
            "max_energy": node["max_energy"],
            "importance": node["importance"],
            "health_percent": round((node["energy"] / node["max_energy"]) * 100, 1),
        }

    def get_nodes(self) -> Dict:
        return {
            node_id: {
                "energy": node["energy"],
                "max_energy": node["max_energy"],
                "importance": node["importance"],
                "health_percent": round((node["energy"] / node["max_energy"]) * 100, 1),
            }
            for node_id, node in self.nodes.items()
        }

    def is_complete(self) -> bool:
        return False

    def set_active_role(self, role: Optional[str]) -> SimulationState:
        """Switch the active team role (Team Mode). Never changes metrics."""
        allowed = set(ROLE_BONUS.keys())
        if role and role in allowed:
            self.active_role = role
        return self.get_current_state()

    # ------------------------------------------------------------------
    # Committing solutions
    # ------------------------------------------------------------------
    def apply_game_action(self, action_type: str, target_event: str = None) -> SimulationState:
        """Apply a solution. Metrics change ONLY here (on an actual submitted solution)."""
        if action_type not in self.action_effects:
            return self.get_current_state()
        if self.game_status != "playing":
            return self.get_current_state()

        effects = self.action_effects[action_type]

        # Determine the problem being addressed.
        event_to_solve = None
        if target_event and target_event in self.active_events and self.problem_states.get(target_event) != SOLVED:
            event_to_solve = target_event
        elif self.current_event and self.problem_states.get(self.current_event) != SOLVED:
            event_to_solve = self.current_event
        if not event_to_solve:
            return self.get_current_state()

        # Check energy affordability before committing.
        total_energy = self._total_energy()
        if total_energy < effects["energy_cost"]:
            self.combo = 0
            self.last_result = None
            self.last_message = "Not enough energy for this action."
            self.last_problem = event_to_solve
            self.last_action = action_type
            return self.get_current_state()

        self._spend_energy(effects["energy_cost"])
        if effects["energy_bonus"] != 0:
            if effects["energy_bonus"] > 0:
                self._add_energy(effects["energy_bonus"])
            else:
                self._spend_energy(abs(effects["energy_bonus"]))

        correct = self._action_solves_event(action_type, event_to_solve)

        if correct:
            self.combo += 1
            combo_multiplier = 1 + (self.combo * 0.1)
            action_score = int(effects["accuracy_reward"] * 100 * combo_multiplier)
            self.score += action_score

            reward = self._calculate_correct_reward(action_type, event_to_solve)
            self._update_accuracy("CORRECT", reward)
            self.base_brain_health = max(0.0, min(100.0, self.base_brain_health + reward * 25))
            self.score += int(reward * 200 * (1 + self.combo * 0.2))

            self.events_solved += 1
            self.current_level = min(7, self.events_solved + 1)
            self.attempted_problems.discard(event_to_solve)
            self.problem_states[event_to_solve] = SOLVED

            self.last_result = "correct"
            self.last_message = "Good Decision"
            self.last_problem = event_to_solve
            self.last_action = action_type
            self.current_event = self._next_unsolved()
        else:
            penalty = self._calculate_wrong_penalty(event_to_solve)
            self._update_accuracy("WRONG", penalty)
            self.base_brain_health = max(0.0, min(100.0, self.base_brain_health - penalty * 15))
            self.combo = 0
            self.attempted_problems.add(event_to_solve)
            if self.problem_states.get(event_to_solve) != SOLVED:
                self.problem_states[event_to_solve] = IN_PROGRESS
            self.current_event = event_to_solve

            self.last_result = "incorrect"
            self.last_message = "Try Another Approach"
            self.last_problem = event_to_solve
            self.last_action = action_type

        return self.get_current_state()

    def _spend_energy(self, amount: float):
        energy_to_remove = amount
        for node_id in self.nodes:
            if energy_to_remove <= 0:
                break
            available = self.nodes[node_id]["energy"]
            remove = min(available, energy_to_remove)
            self.nodes[node_id]["energy"] = max(0.0, self.nodes[node_id]["energy"] - remove)
            energy_to_remove -= remove

    def _add_energy(self, amount: float):
        bonus = amount
        for node_id in self.nodes:
            if bonus <= 0:
                break
            space = self.nodes[node_id]["max_energy"] - self.nodes[node_id]["energy"]
            add = min(space, bonus)
            self.nodes[node_id]["energy"] = min(self.nodes[node_id]["max_energy"], self.nodes[node_id]["energy"] + add)
            bonus -= add

    def _action_solves_event(self, action: str, event: str) -> bool:
        solutions = {
            "clean_dataset": ["Dirty Data", "Silent Data Corruption"],
            "normalize_data": ["Dirty Data", "Missing Values"],
            "remove_noise": ["Noise"],
            "balance_dataset": ["Class Imbalance", "Feedback Loop"],
            "tune_hyperparameters": ["Bias", "Overfitting", "Underfitting"],
            "collect_more_data": ["Class Imbalance", "Data Drift", "Edge Cases"],
            "feature_selection": ["Data Drift", "Concept Drift", "Feature Overload"],
            "validate_model": ["Concept Drift", "Edge Cases", "Deployment Risk", "Adversarial Noise"],
            "regularize_model": ["Overfitting", "Bias"],
            "enhance_features": ["Underfitting"],
            "harden_model": ["Adversarial Noise", "Edge Cases"],
            "stress_test_model": ["Edge Cases", "Deployment Risk"],
            "monitor_model": ["Model Drift in Production", "Feedback Loop"],
            "retrain_model": ["Model Drift in Production", "Feedback Loop", "Data Drift"],
            "staged_rollout": ["Deployment Risk"],
            "data_audit": ["Silent Data Corruption"],
        }
        return event in solutions.get(action, [])

    def advance_time(self, seconds: int) -> SimulationState:
        if self.game_status != "playing":
            return self.get_current_state()

        self.time_remaining = max(0, self.time_remaining - seconds)
        self.event_timer += seconds
        return self.get_current_state()


_sim_instance = None


def get_simulation() -> NeuralSimulation:
    global _sim_instance
    if _sim_instance is None:
        _sim_instance = NeuralSimulation()
    return _sim_instance
