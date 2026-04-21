type Theme = {
  dark: boolean;
  colors: {
    primary: string;
    secondary: string;
    error: string;

    surface: string;
    background: string;

    text: string;

    cpuPrimary: string;
    ramPrimary: string;
    storagePrimary: string;
    networkPrimary: string;
    gpuPrimary: string;
  };
};

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#0ea5e9',
    secondary: '#64748b',
    error: '#ef4444',

    surface: '#ffffff',
    background: '#f8fafc',

    text: '#0f172a',

    cpuPrimary: '#06b6d4',
    ramPrimary: '#f43f5e',
    storagePrimary: '#10b981',
    networkPrimary: '#f59e0b',
    gpuPrimary: '#8b5cf6',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#38bdf8',
    secondary: '#94a3b8',
    error: '#f87171',

    surface: '#1e293b',
    background: '#0f172a',

    text: '#f8fafc',

    cpuPrimary: '#22d3ee',
    ramPrimary: '#fb7185',
    storagePrimary: '#34d399',
    networkPrimary: '#fbbf24',
    gpuPrimary: '#a78bfa',
  },
};

export { lightTheme, darkTheme };

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends Theme {}
}
