import React from 'react';
import { FiUsers, FiCalendar } from 'react-icons/fi';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import leadershipData from '../../data/leadership.json';

export const Leadership: React.FC = () => {
  const formatDate = (startDate: string, endDate: string, current: boolean) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const end = current ? 'Present' : new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <section id="leadership" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Leadership & Activities
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full" />
        </div>

        {/* Leadership Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leadershipData.leadership.map((item) => (
            <Card key={item.id} hover>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-full bg-secondary-light/10 dark:bg-secondary-dark/10">
                    <FiUsers className="h-8 w-8 text-secondary-light dark:text-secondary-dark" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    {item.role} at {item.organization}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
                    <FiCalendar className="h-4 w-4" />
                    <span>{formatDate(item.startDate, item.endDate, item.current)}</span>
                  </div>

                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 leading-relaxed">
                    {item.description}
                  </p>

                  {item.achievements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                        Key Achievements:
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {item.achievements.map((achievement, index) => (
                          <li key={index}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.skills.map((skill, index) => (
                        <Badge key={index}>{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
