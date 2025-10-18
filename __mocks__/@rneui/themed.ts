/**
 * Global mock for @rneui/themed
 * Mocks common components to avoid deep dependency trees in tests
 */

export const Icon = 'Icon';

export const Button = 'Button';

export const Input = 'Input';

export const Text = 'Text';

export const Card = 'Card';

export const Avatar = 'Avatar';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => children;

export const useTheme = jest.fn(() => ({
  theme: {
    colors: {
      primary: '#2089dc',
      secondary: '#ca71eb',
      grey0: '#393e42',
      grey1: '#43484d',
      grey2: '#5e6977',
      grey3: '#86939e',
      grey4: '#bdc6cf',
      grey5: '#e1e8ee',
      greyOutline: '#bbb',
      searchBg: '#303337',
      success: '#52c41a',
      error: '#ff190c',
      warning: '#faad14',
      divider: '#bcbbc1',
    },
  },
  updateTheme: jest.fn(),
  replaceTheme: jest.fn(),
}));

export const theme = {
  colors: {
    grey1: '#43484d',
    grey2: '#5e6977',
    grey3: '#86939e',
    primary: '#2089dc',
    secondary: '#ca71eb',
  },
};
