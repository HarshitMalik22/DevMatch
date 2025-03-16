import React, { useState } from 'react';
import { X } from 'lucide-react';

const AVAILABLE_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
  'Python', 'Java', 'C++', 'Go', 'Rust', 'AWS', 'Docker', 'Kubernetes',
  'Machine Learning', 'Data Science', 'UI/UX Design', 'Mobile Development'
];

interface SkillRequirementsProps {
  onRequirementsChange: (skills: string[]) => void;
  onClearRequirements: () => void;
}

export default function SkillRequirements({ onRequirementsChange, onClearRequirements }: SkillRequirementsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSkillToggle = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(newSkills);
    onRequirementsChange(newSkills);
  };

  const handleClear = () => {
    setSelectedSkills([]);
    onClearRequirements();
    setIsOpen(false);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-primary"
        >
          {isOpen ? 'Close Requirements' : 'Add Requirements'}
        </button>
        <button
          onClick={handleClear}
          className="btn btn-secondary"
        >
          No Requirements
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Required Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white'
                }`}
              >
                {skill}
                {selectedSkills.includes(skill) && (
                  <X className="inline-block w-4 h-4 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSkills.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing profiles with skills: {selectedSkills.join(', ')}
        </div>
      )}
    </div>
  );
}