import { privacyPolicy, termsOfUse } from './legalContent.js'

export const defaultSiteContent = {
  hero: {
    image: 'https://images.pexels.com/photos/6129106/pexels-photo-6129106.jpeg?auto=compress&cs=tinysrgb&w=1600',
    eyebrow: 'Thoughtful care, close to home',
    headline: 'Feel safer right at home.',
    introduction: 'We help make home a more comfortable place to live, heal, and stay connected.',
    primaryLabel: 'Let’s talk about care',
    primaryUrl: '#contact',
    secondaryLabel: 'Open App',
    secondaryUrl: import.meta.env.VITE_CLIENT_APP_URL || '',
  },
  faqs: [
    {
      question: 'What services do you offer?',
      answer: 'We offer personal care, skilled nursing, specialized care, companionship, homemaker services, and 24/7 availability.',
    },
    {
      question: 'How do I request care?',
      answer: 'Send us a care request using the form on this page or call us at 224-204-3281. Our team will be in touch to learn more about your needs.',
    },
    {
      question: 'Where does Cedar Healthcare provide care?',
      answer: 'Our office is in Chicago, Illinois. Call our team to talk about care availability in your area.',
    },
    {
      question: 'Can I talk with someone before choosing a service?',
      answer: 'Absolutely. Call us or send a request and we will help you explore the options that may be right for you and your family.',
    },
  ],
  privacyPolicy,
  termsOfUse,
}