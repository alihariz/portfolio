import React from 'react';
import { FiAward, FiBriefcase, FiCode, FiDatabase } from 'react-icons/fi';
import { Card } from '../ui/Card';
import profileData from '../../data/profile.json';

export const About: React.FC = () => {
  const { personal } = profileData;

  const highlights = [
    {
      icon: FiBriefcase,
      title: 'Industrial Training',
      description: '6 months at Malaysia Airports building systems people actually use in production',
    },
    {
      icon: FiCode,
      title: 'Full-Stack Work',
      description: 'Built 9+ apps covering everything from Vue.js to Spring Boot',
    },
    {
      icon: FiDatabase,
      title: 'ML & Automation',
      description: 'Used BERT and T5 to automate sorting thousands of complaints',
    },
    {
      icon: FiAward,
      title: 'ISTQB Certified',
      description: 'Foundation Level tester certification (scored 80%)',
    },
  ];

  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="about-heading">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            About Me
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full" />
        </div>

        {/* About Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Profile Summary */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark">
              Profile Summary
            </h3>
            <p className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
              {personal.summary}
            </p>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark mr-2">Location:</span>
                <span className="text-text-secondary-light dark:text-text-secondary-dark">{personal.location}</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark mr-2">Email:</span>
                <a
                  href={`mailto:${personal.email}`}
                  className="text-primary-light dark:text-primary-dark hover:underline"
                >
                  {personal.email}
                </a>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark mr-2">Graduation:</span>
                <span className="text-text-secondary-light dark:text-text-secondary-dark">
                  Expected July 2026
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold text-text-primary-light dark:text-text-primary-dark mr-2">Status:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  {personal.availableForWork ? 'Available for Opportunities' : 'Not Available'}
                </span>
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <Card key={index} hover className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-full bg-primary-light/10 dark:bg-primary-dark/10">
                      <Icon className="h-8 w-8 text-primary-light dark:text-primary-dark" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                    {highlight.title}
                  </h4>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                    {highlight.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Key Achievements */}
        <div className="bg-gradient-to-r from-primary-light/10 to-secondary-light/10 dark:from-primary-dark/10 dark:to-secondary-dark/10 rounded-2xl p-8">
          <h3 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6 text-center">
            Key Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-light dark:text-primary-dark mb-2">9</div>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">Projects Completed</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-light dark:text-primary-dark mb-2">3.43</div>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">CGPA at UTM</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-light dark:text-primary-dark mb-2">6mo</div>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">Industrial Training</p>
            </div>
          </div>
          <div className="text-center border-t border-border-light/20 dark:border-border-dark/20 pt-6">
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
              Graduating July 2026 • Looking for software dev opportunities
            </p>
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-light dark:bg-primary-dark text-white font-medium hover:opacity-90 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:ring-offset-2 shadow-lg hover:shadow-xl"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View My Projects
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
