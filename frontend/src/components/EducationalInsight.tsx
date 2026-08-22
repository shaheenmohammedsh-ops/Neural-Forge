import { memo, useState, useEffect } from 'react';
import { EDUCATIONAL_INSIGHTS } from '../config/missions';

interface EducationalInsightProps {
  event: string | null;
  action: string;
  show: boolean;
  onClose: () => void;
}

function EducationalInsight({ event, action, show, onClose }: EducationalInsightProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show || !event) return null;

  const eventInsights = EDUCATIONAL_INSIGHTS[event];
  const currentInsight = eventInsights && eventInsights[action] ? eventInsights[action] : null;

  if (!currentInsight) return null;

  return (
    <div className={`fixed bottom-4 right-4 max-w-lg bg-gray-900/95 backdrop-blur-sm border border-[#0ea5e9]/30 rounded-2xl p-6 shadow-2xl z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">💡</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold text-[#0ea5e9]">Insight Unlocked</h3>
            <div className="px-2 py-1 bg-[#0ea5e9]/20 rounded-full text-xs text-[#0ea5e9] font-medium">
              {event}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4 mb-3 border border-gray-700/50">
            <p className="text-sm text-gray-200 leading-relaxed">
              {currentInsight.insight}
            </p>
          </div>
          
          <div className="flex items-start gap-2 bg-[#3b82f6]/10 rounded-lg p-3 border border-[#3b82f6]/20">
            <svg className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="text-xs font-semibold text-[#3b82f6] mb-1">Why It Matters</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {currentInsight.real_world_application}
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b-2xl overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] animate-[width_6s_linear_forwards]" style={{ width: '100%' }} />
      </div>
    </div>
  );
}

export default memo(EducationalInsight);
