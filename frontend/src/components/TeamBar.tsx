import { memo } from 'react';
import { TEAM_ROLES } from '../config/gameplay';

interface TeamBarProps {
  teamMode: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
}

function TeamBar({ teamMode, selectedRole, onRoleChange, disabled }: TeamBarProps) {
  if (!teamMode) return null;

  return (
    <div className="shrink-0 border-b border-gray-800/70 bg-gray-950/50 px-3 py-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto slim-scroll">
        <span className="text-[9px] uppercase tracking-widest text-gray-500 shrink-0">My Role</span>
        {TEAM_ROLES.map((role) => (
          <button
            key={role.id}
            disabled={disabled}
            onClick={() => onRoleChange(role.id)}
            title={role.description}
            className={[
              'flex items-center gap-1 px-2 h-6 rounded-md border text-[11px] font-medium transition-all shrink-0',
              selectedRole === role.id
                ? 'border-[#7c3aed]/60 bg-[#7c3aed]/15 text-[#a78bfa]'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200',
            ].join(' ')}
          >
            <span className="text-xs leading-none">{role.icon}</span>
            {role.id}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(TeamBar);
