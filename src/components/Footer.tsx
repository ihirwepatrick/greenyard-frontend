import React, { useEffect, useMemo, useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { fetchFooterContent } from '../services/contentApi';
import { FooterContent, FooterLink, FooterSocialLink } from '../types';

const defaultFooterContent: FooterContent = {
  about: {
    title: 'GreenYard',
    description: "Your trusted partner for beautiful flowers and quality seedlings. We bring nature's beauty to your doorstep with care and expertise."
  },
  socialLinks: [
    { platform: 'facebook', url: 'https://www.facebook.com/61575436356758' },
    { platform: 'instagram', url: '#' },
    { platform: 'twitter', url: '#' },
    { platform: 'youtube', url: '#' }
  ],
  quickLinks: [
    { label: 'Home', page: 'home' },
    { label: 'Help Center', page: 'help' },
    { label: 'Contact Us', page: 'contact' },
    { label: 'FAQs', page: 'faqs' }
  ],
  customerLinks: [
    { label: 'Shipping Info', page: 'shipping' },
    { label: 'Returns Policy', page: 'returns' },
    { label: 'Care Instructions', page: 'care' }
  ],
  contact: {
    address: 'Karuruma, Kigali, Rwanda',
    phone: '+250 781 234 567',
    email: 'hello@greenyard.rw'
  },
  newsletter: {
    headline: 'Newsletter',
    placeholder: 'Your email',
    ctaLabel: 'Subscribe'
  },
  legalLinks: [
    { label: 'Privacy Policy', page: 'privacy' },
    { label: 'Terms of Service', page: 'terms' },
    { label: 'Cookie Policy', page: 'cookies' }
  ],
  copyright: '© 2026 GreenYard. All rights reserved.'
};

const socialIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube
};

const Footer: React.FC = () => {
  const { dispatch } = useApp();
  const [content, setContent] = useState<FooterContent>(defaultFooterContent);

  useEffect(() => {
    let mounted = true;
    fetchFooterContent()
      .then((data) => {
        if (!mounted || !data) return;
        
        setContent({
          ...defaultFooterContent,
          // Always keep frontend links - don't use backend for navigation links
          quickLinks: defaultFooterContent.quickLinks,
          customerLinks: defaultFooterContent.customerLinks,
          legalLinks: defaultFooterContent.legalLinks,
          // Only use backend data for content that should be editable
          socialLinks: Array.isArray(data.socialLinks) && data.socialLinks.length > 0 
            ? data.socialLinks 
            : defaultFooterContent.socialLinks,
          about: data.about ? {
            ...defaultFooterContent.about,
            ...data.about
          } : defaultFooterContent.about,
          contact: data.contact ? {
            ...defaultFooterContent.contact,
            ...data.contact
          } : defaultFooterContent.contact,
          newsletter: data.newsletter ? {
            ...defaultFooterContent.newsletter,
            ...data.newsletter
          } : defaultFooterContent.newsletter,
          copyright: data.copyright || defaultFooterContent.copyright
        });
      })
      .catch((error) => {
        // Keep defaults on error - backend might not be available yet
        console.warn('Failed to load footer content from backend, using defaults:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navigateToPage = (page: string) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
    window.scrollTo(0, 0);
  };

  const handleLink = (link: FooterLink) => {
    if (link.page) {
      navigateToPage(link.page);
      return;
    }

    if (link.href) {
      if (/^https?:\/\//i.test(link.href)) {
        window.open(link.href, '_blank', 'noopener');
        return;
      }
      const normalized = link.href.replace(/^\//, '');
      if (normalized) {
        navigateToPage(normalized);
      }
    }
  };

  // Always use frontend defaults for navigation links - never from backend
  const quickLinks = defaultFooterContent.quickLinks || [];
  const customerLinks = defaultFooterContent.customerLinks || [];
  const legalLinks = defaultFooterContent.legalLinks || [];
  
  // Only social links can come from backend (for URLs)
  const socialLinks = useMemo<FooterSocialLink[]>(
    () => (content.socialLinks && Array.isArray(content.socialLinks) && content.socialLinks.length > 0 
      ? content.socialLinks 
      : defaultFooterContent.socialLinks!),
    [content.socialLinks]
  );

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-6 md:px-10 lg:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="GreenYard Logo" 
                className="w-8 h-8 object-contain"
              />
              <h3 className="text-2xl font-bold">{content.about?.title || defaultFooterContent.about?.title}</h3>
            </div>
            <p className="text-gray-400">
              {content.about?.description || defaultFooterContent.about?.description}
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((link) => {
                const Icon = socialIconMap[link.platform.toLowerCase()] || Facebook;
                return (
                  <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-500 transition-colors">
                    <Icon className="w-6 h-6" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button 
                    onClick={() => handleLink(link)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2">
              {customerLinks.map((link) => (
                <li key={link.label}>
                  <button 
                    onClick={() => handleLink(link)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              {content.contact?.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-400">{content.contact.address}</span>
                </div>
              )}
              {content.contact?.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-400">{content.contact.phone}</span>
                </div>
              )}
              {content.contact?.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-400">{content.contact.email}</span>
                </div>
              )}
            </div>
            
            {/* Newsletter Signup */}
            <div className="mt-6">
              <h5 className="font-semibold mb-3">{content.newsletter?.headline || defaultFooterContent.newsletter?.headline}</h5>
              <div className="flex">
                <input
                  type="email"
                  placeholder={content.newsletter?.placeholder || defaultFooterContent.newsletter?.placeholder}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:border-green-500 text-white"
                />
                <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-r-lg transition-colors">
                  {content.newsletter?.ctaLabel || defaultFooterContent.newsletter?.ctaLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {content.copyright || defaultFooterContent.copyright}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {legalLinks.map((link) => (
                <button 
                  key={link.label}
                  onClick={() => handleLink(link)}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;