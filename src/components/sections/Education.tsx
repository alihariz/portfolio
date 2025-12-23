import React from 'react';
import { TimelineItem } from '../features/TimelineItem';
import educationData from '../../data/education.json';

export const Education: React.FC = () => {
  const formatDate = (startDate: string, endDate: string, current: boolean) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const end = current ? 'Present' : new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <section id="education" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Education
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full" />
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {educationData.education.map((edu) => (
            <TimelineItem
              key={edu.id}
              title={edu.degree}
              organization={edu.institution}
              location={edu.location}
              date={formatDate(edu.startDate, edu.endDate, edu.current)}
              current={edu.current}
              highlights={edu.highlights}
              gpa={edu.gpa}
              maxGpa={edu.maxGpa}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
