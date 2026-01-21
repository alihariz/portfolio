import React, { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend, FiCopy, FiCheck } from 'react-icons/fi';
import emailjs from '@emailjs/browser';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Toast, ToastType } from '../ui/Toast';
import profileData from '../../data/profile.json';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setToast({
        message: `${field} copied to clipboard!`,
        type: 'success'
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setToast({
        message: 'Failed to copy. Please try again.',
        type: 'error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToast(null);

    try {
      // Send email using EmailJS
      await emailjs.send(
        'service_8t64rbo',
        'template_manwzwt',
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          time: new Date().toLocaleString(),
        },
        'nEOkHice5uDGS8jTV'
      );

      setToast({
        message: "Thanks for reaching out! I'll get back to you soon.",
        type: 'success'
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Email send failed:', error);
      setToast({
        message: 'Something went wrong. Please try again or email me directly.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
            Get In Touch
          </h2>
          <div className="w-20 h-1 bg-primary-light dark:bg-primary-dark mx-auto rounded-full mb-4" />
          <p className="text-text-secondary-light dark:text-text-secondary-dark max-w-2xl mx-auto">
            Open to software engineering opportunities starting July 2026. If you'd like to connect, send a message here or email me.
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
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
                      Email
                    </h4>
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${profileData.personal.email}`}
                        className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
                      >
                        {profileData.personal.email}
                      </a>
                      <button
                        onClick={() => copyToClipboard(profileData.personal.email, 'Email')}
                        className="p-1.5 rounded-md hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                        aria-label="Copy email to clipboard"
                      >
                        {copiedField === 'Email' ? (
                          <FiCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <FiCopy className="h-4 w-4 text-text-secondary-light dark:text-text-secondary-dark" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10">
                    <FiPhone className="h-6 w-6 text-primary-light dark:text-primary-dark" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
                      Phone
                    </h4>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${profileData.personal.phone}`}
                        className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors"
                      >
                        {profileData.personal.phone}
                      </a>
                      <button
                        onClick={() => copyToClipboard(profileData.personal.phone, 'Phone')}
                        className="p-1.5 rounded-md hover:bg-primary-light/10 dark:hover:bg-primary-dark/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                        aria-label="Copy phone number to clipboard"
                      >
                        {copiedField === 'Phone' ? (
                          <FiCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <FiCopy className="h-4 w-4 text-text-secondary-light dark:text-text-secondary-dark" />
                        )}
                      </button>
                    </div>
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full transform hover:scale-105 shadow-lg hover:shadow-xl"
                variant="primary"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Sending...
                  </>
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

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
};
