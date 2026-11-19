import { privacyPolicy, termsOfUse } from './legalContent.js'

export const defaultSiteContent = {
  hero: {
    image: 'https://images.pexels.com/photos/8088906/pexels-photo-8088906.jpeg?auto=compress&cs=tinysrgb&w=1600',
    eyebrow: 'Personalized home care in Chicago',
    headline: 'Cedar Healthcare home care in Chicago, shaped around your life.',
    introduction: 'From daily routines to changing health needs, Cedar Healthcare offers thoughtful, personalized support to help you feel comfortable, connected, and cared for at home.',
    primaryLabel: 'Talk with our care team',
    primaryUrl: '#contact',
    secondaryLabel: 'Open App',
    secondaryUrl: import.meta.env.VITE_CLIENT_APP_URL || '',
  },
  faqs: [
    {
      question: 'What services do you offer?',
      answer: 'Cedar offers personal care, specialized care, companionship, homemaker services, and around-the-clock availability. Contact us to discuss which services may fit your needs.',
    },
    {
      question: 'What does non-medical home care include?',
      answer: 'Non-medical home care offers practical help with everyday activities rather than medical treatment. Depending on your routine, support may include personal care, companionship, meal preparation, light housekeeping, or errands. Contact Cedar to discuss which services and schedule may be appropriate.',
    },
    {
      question: 'Can I arrange home care for a family member?',
      answer: 'Yes. A family member can contact Cedar Healthcare to talk about a loved one’s daily routines, preferences, and the support they are looking for. Our Chicago home-care team can explain available services and scheduling options, and discuss next steps with the family.',
    },
    {
      question: 'How do I get started?',
      answer: 'Send a care request using the form on this page or call 224-204-3281. Our team will listen, learn about your routines and goals, and talk through possible next steps.',
    },
    {
      question: 'Can Cedar adjust support as my needs change?',
      answer: 'Cedar offers non-medical home-care support tailored to routines, preferences, and day-to-day needs. Contact us to discuss your situation and confirm what services and availability are appropriate.',
    },
    {
      question: 'Where does Cedar Healthcare provide care?',
      answer: 'Our office is in Chicago, Illinois. Contact our team to ask about care availability in your area.',
    },
  ],
  privacyPolicy,
  termsOfUse,
}