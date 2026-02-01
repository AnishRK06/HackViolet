// Soft Pink/Coral Design System for Lumina app
export const COLORS = {
  bg: {
    gradient: ['#E8BEBE', '#FFF8F8'],  // Harsher pink gradient (17.5% more contrast)
    primary: '#FFF5F5',
    secondary: '#FFFFFF',
    card: '#FFFFFF',
    cardSolid: '#FFFFFF',
  },
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.03)',
  text: {
    primary: '#2D2D2D',      // Dark brown/charcoal
    secondary: '#5C5C5C',     // Gray 40% darker
    muted: '#707070',         // Gray 40% darker
    dark: '#2D2D2D',
  },
  accent: {
    primary: '#CC7C6E',       // Coral 25% darker (tab buttons)
    danger: '#FF6B6B',        // Soft red
    success: '#A8E6CF',       // Soft mint green
    info: '#B8DCEF',          // Darker blue (15% darker)
    warning: '#FFE0B2',       // Soft orange
    lavender: '#F3E5F5',      // Lavender background
    peach: '#FFE5DC',         // Peach background
  },
  overlay: 'rgba(0, 0, 0, 0.3)',
  iconBg: {
    blue: '#B8DCEF',          // Darker blue (15% darker)
    lavender: '#F3E5F5',
    peach: '#FFE5DC',
    mint: '#E8F5E9',
  }
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#CC7C6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
