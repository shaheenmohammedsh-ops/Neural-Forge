import { memo, useState } from 'react';

interface TutorialPopupProps {
  onClose: () => void;
}

function TutorialPopup({ onClose }: TutorialPopupProps) {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Your Mission",
      content: "Improve the AI model to 90% accuracy before time or energy runs out.",
      icon: "🎯"
    },
    {
      title: "7 AI Problems",
      content: "Select any problem from the board. You can switch freely between problems.",
      icon: "🧩"
    },
    {
      title: "Strategic Actions",
      content: "Each action costs energy. Choose wisely to reach the target.",
      icon: "⚡"
    }
  ];
  
  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };
  
  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 rounded-2xl p-8 max-w-md w-full border border-gray-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#3b82f6] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">{steps[step].icon}</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">{steps[step].title}</h2>
          <p className="text-gray-300 text-base leading-relaxed">{steps[step].content}</p>
        </div>
        
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === step ? 'bg-[#0ea5e9] scale-125' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        
        <div className="flex justify-between gap-4">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Previous
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] text-white rounded-lg hover:from-[#0284c7] hover:to-[#2563eb] transition-all text-sm font-medium"
          >
            {step === steps.length - 1 ? 'Begin' : 'Next'}
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
}

export default memo(TutorialPopup);
