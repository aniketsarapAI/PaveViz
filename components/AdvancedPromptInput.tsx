import React from 'react';

interface AdvancedPromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const AdvancedPromptInput: React.FC<AdvancedPromptInputProps> = ({ value, onChange }) => {
  return (
    <div className="w-full">
      <label htmlFor="advanced-prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Need a change? Provide refinement instructions to the AI.
      </label>
      <textarea
        id="advanced-prompt"
        rows={2}
        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-londonstone-red focus:border-londonstone-red transition-colors"
        placeholder={'e.g., "Change the paving layout to a straight grid pattern.", "Make the paving a bit larger"'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};