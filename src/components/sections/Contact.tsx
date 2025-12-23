import React, { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import profileData from '../../data/profile.json';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // TODO: Integrate with EmailJS
    // For now, simulate submission
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Get In Touch
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full mb-4" />
          <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
            I'm currently looking for opportunities to apply my technical expertise. Feel free to reach out!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
                    <FiMail className="h-6 w-6 text-primary-light dark:text-primary-dark" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
                      Email
                    </h4>
                    <a
                      href={`mailto:${profileData.personal.email}`}
                      className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
                    >
                      {profileData.personal.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
                    <FiPhone className="h-6 w-6 text-primary-light dark:text-primary-dark" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
                      Phone
                    </h4>
                    <a
                      href={`tel:${profileData.personal.phone}`}
                      className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
                    >
                      {profileData.personal.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
                    <FiMapPin className="h-6 w-6 text-primary-light dark:text-primary-dark" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
                      Location
                    </h4>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark">
                      {profileData.personal.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-gradient-to-r from-primary-light/10 to-secondary-light/10 dark:from-primary-dark/10 dark:to-secondary-dark/10">
              <h4 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                Looking for opportunities
              </h4>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Graduating July 2026. Open to full-time positions, internships, and freelance projects in software development.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Name"
                name="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                label="Subject"
                name="subject"
                type="text"
                placeholder="What's this about?"
                value={formData.subject}
                onChange={handleChange}
                required
              />

              <Input
                label="Message"
                name="message"
                multiline
                rows={6}
                placeholder="Your message..."
                value={formData.message}
                onChange={handleChange}
                required
              />

              {submitStatus === 'success' && (
                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  Thank you for your message! I'll get back to you soon.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                  Something went wrong. Please try again or email me directly.
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                variant="primary"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <FiSend className="inline mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
