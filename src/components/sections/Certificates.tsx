import React, { useState } from 'react';
import { FiAward, FiCalendar } from 'react-icons/fi';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import certificatesData from '../../data/certificates.json';

interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string;
  credentialUrl: string;
  score?: string;
  description: string;
  skills: string[];
  featured: boolean;
  imagePath: string | null;
}

export const Certificates: React.FC = () => {
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleCertClick = (cert: Certificate) => {
    if (cert.imagePath) {
      setSelectedCert(cert);
    }
  };

  return (
    <section id="certificates" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Certificates & Qualifications
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full" />
        </div>

        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificatesData.certificates.map((cert) => (
            <Card
              key={cert.id}
              hover
              className={`${cert.featured ? 'border-primary-light dark:border-primary-dark' : ''} ${cert.imagePath ? 'cursor-pointer' : ''}`}
              onClick={() => handleCertClick(cert as Certificate)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-full bg-primary-light/10 dark:bg-primary-dark/10">
                    <FiAward className="h-8 w-8 text-primary-light dark:text-primary-dark" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                    {cert.name}
                  </h3>
                  <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    {cert.issuer}
                  </p>

                  {cert.score && (
                    <p className="text-sm text-primary-light dark:text-primary-dark font-medium mb-2">
                      Score: {cert.score}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark mb-3">
                    <FiCalendar className="h-4 w-4" />
                    <span>Issued {formatDate(cert.issueDate)}</span>
                  </div>

                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 leading-relaxed">
                    {cert.description}
                  </p>

                  {cert.imagePath && (
                    <p className="text-xs text-primary-light dark:text-primary-dark font-medium mb-3 flex items-center gap-1">
                      <FiAward className="h-3 w-3" />
                      Click to view certificate
                    </p>
                  )}

                  {cert.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {cert.skills.map((skill, index) => (
                        <Badge key={index} variant="primary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Certificate Image Modal */}
      <Modal
        isOpen={selectedCert !== null}
        onClose={() => setSelectedCert(null)}
        title={selectedCert?.name}
      >
        {selectedCert?.imagePath && (
          <div className="p-4">
            <img
              src={selectedCert.imagePath}
              alt={selectedCert.name}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}
      </Modal>
    </section>
  );
};
