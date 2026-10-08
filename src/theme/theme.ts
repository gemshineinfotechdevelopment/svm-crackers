import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E40AF', // Classic Desktop Royal Navy Blue
      light: '#DBEAFE',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#741748', // Classic Desktop Wine / Burgundy (Save Button)
      light: '#FCE7F3',
      dark: '#500724',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0284C7',
      light: '#E0F2FE',
      dark: '#0369A1',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669',
      light: '#ECFDF5',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    background: {
      default: '#D9E4F2', // Authentic Desktop ERP light blue-slate
      paper: '#FFFFFF',
    },
    divider: '#B5C8DD',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h1: {
      fontSize: '24px',
      fontWeight: 800,
      color: '#0F172A',
      letterSpacing: '-0.01em',
    },
    h2: {
      fontSize: '20px',
      fontWeight: 700,
      color: '#0F172A',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#0F172A',
    },
    subtitle1: {
      fontSize: '13.5px',
      fontWeight: 600,
      color: '#0F172A',
    },
    body1: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#0F172A',
    },
    body2: {
      fontSize: '12px',
      fontWeight: 500,
      color: '#475569',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      fontSize: '13px',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: '4px',
          boxShadow: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: '12px',
          color: '#0F172A',
          backgroundColor: '#DCE7F5',
          borderBottom: '1px solid #B5C8DD',
          borderRight: '1px solid #CBD5E1',
          padding: '6px 8px',
        },
        body: {
          fontSize: '12.5px',
          fontWeight: 500,
          color: '#0F172A',
          borderBottom: '1px solid #E2E8F0',
          borderRight: '1px solid #F1F5F9',
          padding: '5px 8px',
        },
      },
    },
  },
});
