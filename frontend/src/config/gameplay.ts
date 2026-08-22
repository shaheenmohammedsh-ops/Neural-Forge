export const TEAM_ROLES = [
  { id: 'Data Analyst', icon: '🔍', description: 'Owns problem selection and data quality' },
  { id: 'ML Engineer', icon: '🧠', description: 'Owns training and tuning the model' },
  { id: 'Security Analyst', icon: '🛡️', description: 'Owns risk assessment and adversarial defense' },
  { id: 'Team Lead', icon: '🎯', description: 'Owns coordination and final decisions' },
];

export const ACTION_NAMES: Record<string, string> = {
  clean_dataset: 'Clean Dataset',
  remove_noise: 'Remove Noise',
  normalize_data: 'Normalize Features',
  balance_dataset: 'Balance Classes',
  feature_selection: 'Feature Selection',
  tune_hyperparameters: 'Tune Hyperparameters',
  collect_more_data: 'Collect More Data',
  validate_model: 'Validate Model',
};

export const ACTION_SHORT: Record<string, string> = {
  clean_dataset: 'Clean',
  remove_noise: 'De-noise',
  normalize_data: 'Normalize',
  balance_dataset: 'Balance',
  feature_selection: 'Select Feat.',
  tune_hyperparameters: 'Tune',
  collect_more_data: 'More Data',
  validate_model: 'Validate',
};

export const PROBLEM_STATE_LABEL: Record<string, { label: string; cls: string }> = {
  UNRESOLVED: { label: 'Unresolved', cls: 'text-gray-400 border-gray-600/50 bg-gray-800/30' },
  SELECTED: { label: 'Selected', cls: 'text-[#0ea5e9] border-[#0ea5e9]/40 bg-[#0ea5e9]/10' },
  IN_PROGRESS: { label: 'In Progress', cls: 'text-amber-400 border-amber-400/40 bg-amber-400/10' },
  SOLVED: { label: 'Solved', cls: 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10' },
  SKIPPED: { label: 'Skipped', cls: 'text-gray-500 border-gray-600/30 bg-gray-800/20' },
};
