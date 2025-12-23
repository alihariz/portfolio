import React from 'react';
import { Card } from '../ui/Card';
import experienceData from '../../data/experience.json';

export const Experience: React.FC = () => {
  const formatDate = (startDate: string, endDate: string, current: boolean) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const end = current ? 'Present' : new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <section id="experience" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Experience
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full" />
        </div>

        {/* Experience Timeline */}
        <div className="space-y-0">
          {experienceData.experience.map((exp) => (
            <div key={exp.id} className="relative pl-8 pb-12 last:pb-0">
              {/* Timeline Line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border-light dark:bg-border-dark" />

              {/* Timeline Dot */}
              <div className="absolute left-0 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-primary-light dark:bg-primary-dark border-4 border-background-light dark:border-background-dark" />

              {/* Content */}
              <div className="space-y-4">
                {/* Main Experience Card */}
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
                        {exp.position}
                      </h3>
                      <p className="text-md text-text-secondary-light dark:text-text-secondary-dark mb-2">
                        {exp.department}
                      </p>
                      <p className="text-md font-medium text-text-primary-light dark:text-text-primary-dark">
                        {exp.company}
                      </p>
                      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {exp.location}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 sm:text-right">
                      <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                        {formatDate(exp.startDate, exp.endDate, exp.current)}
                      </p>
                      {exp.current && (
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Accomplishments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0">
                  {exp.accomplishments.map((accomplishment, index) => (
                    <Card key={index} hover>
                      <h4 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                        {accomplishment.title}
                      </h4>
                      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3 leading-relaxed">
                        {accomplishment.description}
                      </p>
                      {accomplishment.impact && (
                        <p className="text-sm font-medium text-primary-light dark:text-primary-dark mb-3">
                          Impact: {accomplishment.impact}
                        </p>
                      )}
                      {accomplishment.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {accomplishment.technologies.map((tech, techIndex) => (
                            <span
                              key={techIndex}
                              className="px-2 py-1 text-xs rounded bg-surface-light dark:bg-surface-dark text-text-secondary-light dark:text-text-secondary-dark border border-border-light dark:border-border-dark"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
