import React from 'react';
import { SkillCategory } from '../features/SkillCategory';
import skillsDataRaw from '../../data/skills.json';
import type { SkillsData } from '../../types/skill.types';

const skillsData = skillsDataRaw as SkillsData;

export const Skills: React.FC = () => {
  return (
    <section id="skills" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Skills & Technologies
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full mb-4" />
          <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
            Tools and frameworks I've picked up from school projects, my internship, and building stuff on my own.
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillsData.skillCategories.map((category) => (
            <SkillCategory key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
};
