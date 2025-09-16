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
        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        placeholder={'e.g., "Don\'t cover the flower pot on the left", "Make the paving stones a bit larger"'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};