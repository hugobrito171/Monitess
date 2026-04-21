import { ConfigProvider } from 'antd';
import { type FC, useLayoutEffect, useMemo } from 'react';
import {
  createGlobalStyle,
  type DefaultTheme,
  ThemeProvider,
} from 'styled-components';
import { useColorScheme } from 'use-color-scheme';
import { MainWidgetContainer } from './components/main-widget-container';
import { SingleWidgetChart } from './components/single-widget-chart';
import { MobileContextProvider } from './services/mobile';
import { useQuery } from './services/query-params';
import { useSetting } from './services/settings';
import { darkTheme, lightTheme } from './theme/theme';

const getLightGradient = (theme: DefaultTheme) => `
linear-gradient(
  225deg,
  #f1f5f9 0%,
  ${theme.colors.background} 100%
)`;

const getDarkGradient = (theme: DefaultTheme) => `
linear-gradient(
  160deg,
  #1e293b 0%,
  ${theme.colors.background} 100%
)`;

const GlobalStyle = createGlobalStyle<{ noBg: boolean }>`
  body {
    background-color: ${({ theme, noBg }) =>
      noBg ? 'transparent' : theme.colors.background};
    height: 100vh;
    width: 100vw;
  }

  #root {
    width: 100%;
    height: 100%;

    background: ${({ theme, noBg }) =>
      noBg
        ? 'transparent'
        : theme.dark
          ? getDarkGradient(theme)
          : getLightGradient(theme)};

    transition: background 0.5s ease;
    background-attachment: fixed;
  }

  .ant-switch {
    background-color: rgba(0, 0, 0, 0.25);
    background-image: unset;
  }

  .ant-btn {
    background: ${({ theme }) => theme.colors.background};
    border: none;
  }
`;

const overrideColor = (
  colors: (typeof darkTheme)['colors'],
  query: ReturnType<typeof useQuery>,
) => {
  if (query.singleWidget) {
    if (query.overrideThemeColor) {
      colors.cpuPrimary = `#${query.overrideThemeColor}`;
      colors.storagePrimary = `#${query.overrideThemeColor}`;
      colors.ramPrimary = `#${query.overrideThemeColor}`;
      colors.networkPrimary = `#${query.overrideThemeColor}`;
      colors.gpuPrimary = `#${query.overrideThemeColor}`;
      colors.primary = `#${query.overrideThemeColor}`;
    }

    if (query.overrideThemeSurface) {
      colors.surface = `#${query.overrideThemeSurface}`;
    }
  }
};

export const App: FC = () => {
  const { scheme } = useColorScheme();
  const [darkMode] = useSetting('darkMode', scheme === 'dark');
  const query = useQuery();

  const theme = useMemo(() => {
    const baseTheme = darkMode ? darkTheme : lightTheme;

    if (query.singleWidget) {
      const queryTheme = query.overrideTheme
        ? query.overrideTheme === 'dark'
          ? darkTheme
          : lightTheme
        : baseTheme;
      overrideColor(queryTheme.colors, query);

      return queryTheme;
    }

    return baseTheme;
  }, [darkMode, query]);

  useLayoutEffect(() => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute('content', theme.dark ? 'dark' : 'light');
    }
  }, [theme.dark]);

  return (
    <ThemeProvider theme={theme}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: theme.colors.primary,
            colorPrimaryHover: theme.colors.primary,
          },
        }}
      >
        <MobileContextProvider>
          {query.singleWidget ? <SingleWidgetChart /> : <MainWidgetContainer />}
        </MobileContextProvider>
      </ConfigProvider>
      <GlobalStyle noBg={query.singleWidget} />
    </ThemeProvider>
  );
};
