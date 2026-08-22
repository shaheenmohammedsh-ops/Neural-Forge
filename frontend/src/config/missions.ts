import type { MissionInfo, MissionStage } from '../types';

/**
 * Four-mission campaign (matches backend LEVELS in simulation.py).
 * Every mission is always unlocked and independently playable; each runs
 * against its own distinct problem set.
 */
export interface MissionLevelInfo {
  level: number;
  title: string;
  subtitle: string;
  description: string;
  difficulty: string;
  duration: number;
  accent: string; // tailwind color token used for theming this level
  problems: string[];
  solo_guide: string;
  team_guide: string;
  customer_objective: string;
  target_accuracy: number;
}

export const MISSION_LEVELS: MissionLevelInfo[] = [
  {
    level: 1,
    title: 'Foundation',
    subtitle: 'Clean data, solid basics',
    description: 'Establish the fundamentals of a reliable AI pipeline. Problems are clearly signposted and each has an obvious solution.',
    difficulty: 'Introductory',
    duration: 180,
    accent: '--level-1',
    problems: ['Dirty Data', 'Missing Values', 'Noise', 'Class Imbalance', 'Data Drift', 'Bias', 'Concept Drift'],
    solo_guide: 'Learn the core loop: inspect a problem, preview a solution, then apply it. Early problems reward fast recognition.',
    team_guide: 'Start with any role. Each role tags its decisions, so everyone can see who handled what.',
    customer_objective: 'Reach 90% accuracy',
    target_accuracy: 0.9,
  },
  {
    level: 2,
    title: 'Model Tuning',
    subtitle: 'Train smarter, not harder',
    description: 'The model is learning poorly. Diagnose overfitting, underfitting and feature overload, and balance several valid options against your energy.',
    difficulty: 'Moderate',
    duration: 180,
    accent: '--level-2',
    problems: ['Overfitting', 'Underfitting', 'Feature Overload', 'Bias', 'Noise', 'Class Imbalance', 'Concept Drift'],
    solo_guide: 'Several problems now have more than one valid solution. Read the trade-offs before spending energy.',
    team_guide: 'Divide the work: one role can own diagnosis, another can own the solution. Compare previews before confirming.',
    customer_objective: 'Reach 90% accuracy',
    target_accuracy: 0.9,
  },
  {
    level: 3,
    title: 'Advanced AI',
    subtitle: 'Reliable under pressure',
    description: 'The stakes rise: adversarial inputs, silent corruption and production drift demand careful analysis and risk-aware choices.',
    difficulty: 'Advanced',
    duration: 180,
    accent: '--level-3',
    problems: ['Adversarial Noise', 'Edge Cases', 'Silent Data Corruption', 'Data Drift', 'Model Drift in Production', 'Overfitting', 'Feature Overload'],
    solo_guide: 'Strong solutions cost more energy. Choose which reliability problems to solve and which to defer.',
    team_guide: 'Strong coordination pays off: let one role verify (validate / stress-test) while another commits the expensive fixes.',
    customer_objective: 'Reach 90% accuracy',
    target_accuracy: 0.9,
  },
  {
    level: 4,
    title: 'High-Risk AI',
    subtitle: 'Decisions under stakes',
    description: 'Deployment risks, feedback loops and adversarial threats collide. Every card is valid somewhere, so precision and prioritization decide the mission.',
    difficulty: 'Expert',
    duration: 180,
    accent: '--level-4',
    problems: ['Deployment Risk', 'Feedback Loop', 'Model Drift in Production', 'Adversarial Noise', 'Silent Data Corruption', 'Concept Drift', 'Edge Cases'],
    solo_guide: 'Every card can be the right answer somewhere. Identify the core threat before committing a costly fix.',
    team_guide: 'Use role specialties aggressively: verify before deploy, and make sure the most expensive fixes are confirmed by the team.',
    customer_objective: 'Reach 90% accuracy',
    target_accuracy: 0.9,
  },
];

export const getMissionLevel = (level: number): MissionLevelInfo =>
  MISSION_LEVELS.find((m) => m.level === level) ?? MISSION_LEVELS[0];

// Backwards-compatible alias used by legacy mission references.
export const CHALLENGES: MissionInfo[] = MISSION_LEVELS.map((m) => ({
  id: m.level,
  title: m.title,
  description: m.description,
  customer_objective: m.customer_objective,
  target_accuracy: m.target_accuracy,
  difficulty: m.difficulty,
  estimated_duration: '3 minutes',
  current_challenge: m.subtitle,
}));

export const MISSION_STAGES: Record<number, MissionStage[]> = {
  1: ['briefing', 'dataset_preparation', 'missing_values', 'noise', 'feature_engineering', 'training', 'bias_detection', 'validation', 'concept_drift', 'deployment', 'mission_complete'],
  2: ['briefing', 'dataset_preparation', 'missing_values', 'noise', 'feature_engineering', 'training', 'bias_detection', 'validation', 'concept_drift', 'deployment', 'mission_complete'],
  3: ['briefing', 'dataset_preparation', 'missing_values', 'noise', 'feature_engineering', 'training', 'bias_detection', 'validation', 'concept_drift', 'deployment', 'mission_complete'],
  4: ['briefing', 'dataset_preparation', 'missing_values', 'noise', 'feature_engineering', 'training', 'bias_detection', 'validation', 'concept_drift', 'deployment', 'mission_complete'],
};

export const STAGE_DESCRIPTIONS: Record<MissionStage, string> = {
  briefing: 'Review challenge objectives',
  dataset_preparation: 'Clean and prepare training data',
  missing_values: 'Handle missing data in the dataset',
  noise: 'Remove noise from the data',
  feature_engineering: 'Select and optimize relevant features',
  training: 'Train the neural network model',
  bias_detection: 'Detect and fix bias in the model',
  validation: 'Validate model performance on test data',
  concept_drift: 'Address concept drift in the model',
  deployment: 'Deploy model to production environment',
  mission_complete: 'Challenge completed - review results'
};

export const EDUCATIONAL_INSIGHTS: Record<string, Record<string, { insight: string; real_world_application: string }>> = {
  'Dirty Data': {
    'clean_dataset': {
      insight: 'Removing dirty data improves model generalization and reduces overfitting.',
      real_world_application: 'Data scientists spend 60-80% of time cleaning data in real projects.'
    },
    'normalize_data': {
      insight: 'Normalization ensures features contribute equally to model learning.',
      real_world_application: 'Essential for distance-based algorithms like neural networks.'
    }
  },
  'Missing Values': {
    'normalize_data': {
      insight: 'Handling missing values prevents bias and maintains data integrity.',
      real_world_application: 'Medical datasets often have incomplete patient records.'
    }
  },
  'Noise': {
    'remove_noise': {
      insight: 'Removing noise improves signal-to-noise ratio for better learning.',
      real_world_application: 'Sensor data in IoT devices frequently contains noise.'
    }
  },
  'Class Imbalance': {
    'balance_dataset': {
      insight: 'Balanced classes prevent model bias toward majority classes.',
      real_world_application: 'Fraud detection has 99% legitimate vs 1% fraudulent transactions.'
    },
    'collect_more_data': {
      insight: 'More data helps minority class representation and model robustness.',
      real_world_application: 'Rare diseases need specialized data collection efforts.'
    }
  },
  'Data Drift': {
    'collect_more_data': {
      insight: 'Fresh data helps models adapt to changing distributions.',
      real_world_application: 'Consumer behavior changes during holidays and crises.'
    },
    'feature_selection': {
      insight: 'Selecting stable features reduces sensitivity to drift.',
      real_world_application: 'Financial models need robust features across market conditions.'
    }
  },
  'Bias': {
    'tune_hyperparameters': {
      insight: 'Proper regularization reduces model overfitting to biased patterns.',
      real_world_application: 'HR hiring models require careful bias mitigation.'
    }
  },
  'Concept Drift': {
    'feature_selection': {
      insight: 'Adaptive feature selection captures evolving relationships.',
      real_world_application: 'Spam filters adapt to new spam techniques.'
    },
    'validate_model': {
      insight: 'Continuous validation detects performance degradation early.',
      real_world_application: 'Autonomous systems require ongoing safety validation.'
    }
  },
  'Overfitting': {
    'regularize_model': {
      insight: 'Regularization constrains model complexity and closes the train-test gap.',
      real_world_application: 'Deep networks are regularized to generalise beyond training data.'
    }
  },
  'Underfitting': {
    'enhance_features': {
      insight: 'Richer features give a too-simple model the capacity it needs.',
      real_world_application: 'Handcrafted features still matter in tabular machine learning.'
    }
  },
  'Feature Overload': {
    'feature_selection': {
      insight: 'Fewer, stronger features reduce variance and runtime.',
      real_world_application: 'Production models prefer a small, explainable feature set.'
    }
  },
  'Adversarial Noise': {
    'harden_model': {
      insight: 'Adversarial training makes the model robust to malicious input perturbations.',
      real_world_application: 'Spam and fraud systems defend against deliberate evasion.'
    }
  },
  'Edge Cases': {
    'stress_test_model': {
      insight: 'Stress testing surfaces rare but dangerous failure modes before deployment.',
      real_world_application: 'Self-driving stacks are validated on long-tail scenarios.'
    }
  },
  'Silent Data Corruption': {
    'data_audit': {
      insight: 'Audits catch silent pipeline corruption before it quietly degrades the model.',
      real_world_application: 'Data pipelines drift silently; monitoring is essential.'
    }
  },
  'Model Drift in Production': {
    'monitor_model': {
      insight: 'Continuous monitoring flags performance decay the moment it starts.',
      real_world_application: 'MLOps teams watch live metrics to detect drift early.'
    }
  },
  'Deployment Risk': {
    'staged_rollout': {
      insight: 'Gradual rollouts contain blast radius and allow controlled validation.',
      real_world_application: 'Canary deployments are standard in production ML.'
    }
  },
  'Feedback Loop': {
    'retrain_model': {
      insight: 'Retraining on fresh data breaks harmful feedback loops between model and world.',
      real_world_application: 'Recommendation systems need scheduled retraining cycles.'
    }
  }
};
