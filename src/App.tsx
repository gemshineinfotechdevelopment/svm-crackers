import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import { Navbar, type NavTab } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { CategoriesPage } from './components/CategoriesPage';
import { PriceListPage } from './components/PriceListPage';
import { ProductsPage } from './components/ProductsPage';
import { SalesPage } from './components/SalesPage';
import { AllCustomersPage } from './components/AllCustomersPage';
import { AddCustomerPage } from './components/AddCustomerPage';
import { ParticularsPage } from './components/ParticularsPage';
import { QuotationPage } from './components/QuotationPage';
import { GstBillPage } from './components/GstBillPage';
import { SettingsPage, getStoredSettings, DEFAULT_COMPANY_SETTINGS } from './components/SettingsPage';
import { SettingsApi } from './services/api';
import { YearRestrictionDialog } from './components/YearRestrictionDialog';
import { type ProductSubPage } from './types/productSubPages';

const ACTIVE_TAB_KEY = 'apsara_active_tab';
const CUSTOMER_SUBVIEW_KEY = 'apsara_customer_subview';
const PRODUCT_SUBPAGE_KEY = 'svm_product_subpage';

const VALID_TABS = ['All Customers', 'Sales', 'Estimate', 'Quotation', 'GST Bill', 'Categories', 'Price List', 'Product', 'Settings'] as const;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('apsara_auth_token'));
  });
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved === 'Billing') return 'Estimate';
    if (saved && VALID_TABS.includes(saved as NavTab)) {
      return saved as NavTab;
    }
    return 'All Customers';
  });
  const [productSubPage, setProductSubPage] = useState<ProductSubPage>(() => {
    const saved = localStorage.getItem(PRODUCT_SUBPAGE_KEY);
    if (
      saved === 'pricemap master' ||
      saved === 'product-Retail sales' ||
      saved === 'product-price map' ||
      saved === 'product-whole sales'
    ) {
      return saved as ProductSubPage;
    }
    return 'product-Retail sales';
  });
  const [customerSubView, setCustomerSubView] = useState<'list' | 'add'>(() => {
    const saved = localStorage.getItem(CUSTOMER_SUBVIEW_KEY);
    return saved === 'list' ? 'list' : 'list';
  });
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [editingBill, setEditingBill] = useState<any | null>(null);

  const handleSelectProductSubPage = (sub: ProductSubPage) => {
    setProductSubPage(sub);
    localStorage.setItem(PRODUCT_SUBPAGE_KEY, sub);
    setActiveTab('Product');
    localStorage.setItem(ACTIVE_TAB_KEY, 'Product');
  };

  useEffect(() => {
    // Clear legacy sticky customer & stale cache if present
    ['varun_active_customer', 'dheeksha_active_customer', 'varun_gst_bills_history', 
     'dheeksha_gst_bills_history', 'varun_draft_bill', 'dheeksha_draft_bill',
     'varun_app_settings', 'dheeksha_app_settings', 'varun_auth_token', 'dheeksha_auth_token',
     'varun_auth_user', 'dheeksha_auth_user'].forEach(key => localStorage.removeItem(key));

    const updateTitle = () => {
      const settings = getStoredSettings();
      const compName = settings.companyName || 'Manjula Crackers';
      document.title = `${compName} - Billing & Management`;
    };
    updateTitle();

    // Fetch settings from MongoDB database so brand identity is always live across all devices
    SettingsApi.get()
      .then((res) => {
        const data = (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
        if (data && typeof data === 'object') {
          const compName = (!data.companyName || data.companyName.toLowerCase().includes('varun') || data.companyName.toLowerCase().includes('dheeksha') || data.companyName.toLowerCase().includes('apsara') || data.companyName.toLowerCase().includes('svm'))
            ? 'Manjula Crackers'
            : (data.companyName ?? DEFAULT_COMPANY_SETTINGS.companyName);

          const remoteSettings = { ...DEFAULT_COMPANY_SETTINGS, ...data, companyName: compName };
          localStorage.setItem('apsara_app_settings', JSON.stringify(remoteSettings));
          window.dispatchEvent(new Event('apsara_settings_updated'));
          updateTitle();
        }
      })
      .catch((err) => {
        console.warn('Could not connect to settings API on startup:', err);
      });

    window.addEventListener('apsara_settings_updated', updateTitle);
    return () => {
      window.removeEventListener('apsara_settings_updated', updateTitle);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    ['apsara_auth_token', 'apsara_auth_user', 'apsara_active_customer', 'apsara_draft_bill',
     'varun_auth_token', 'dheeksha_auth_token', 'varun_auth_user', 'dheeksha_auth_user',
     'varun_active_customer', 'dheeksha_active_customer',
     ACTIVE_TAB_KEY, CUSTOMER_SUBVIEW_KEY].forEach(key => localStorage.removeItem(key));
    setIsAuthenticated(false);
    setActiveTab('All Customers');
    setCustomerSubView('list');
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    localStorage.setItem(ACTIVE_TAB_KEY, tab);
    if (tab === 'All Customers') {
      setCustomerSubView('list');
      localStorage.setItem(CUSTOMER_SUBVIEW_KEY, 'list');
    }
    if (tab === 'Estimate' || tab === 'Quotation') {
      setSelectedCustomerName('');
      setEditingBill(null);
    }
  };

  const handleCustomerSelectedForEstimate = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setEditingBill(null);
    setActiveTab('Estimate');
    localStorage.setItem(ACTIVE_TAB_KEY, 'Estimate');
  };

  const handleCustomerSelectedForQuotation = (customerName: string) => {
    setSelectedCustomerName(customerName);
    setEditingBill(null);
    setActiveTab('Quotation');
    localStorage.setItem(ACTIVE_TAB_KEY, 'Quotation');
  };

  const handleCustomerSelectedForParticular = (customerName: string, subTab?: string) => {
    if (subTab === 'Quotation') {
      handleCustomerSelectedForQuotation(customerName);
    } else {
      handleCustomerSelectedForEstimate(customerName);
    }
  };

  const handleEditBill = (bill: any) => {
    setEditingBill(bill);
    setSelectedCustomerName('');
    if (bill.billType === 'QUOTATION') {
      setActiveTab('Quotation');
      localStorage.setItem(ACTIVE_TAB_KEY, 'Quotation');
    } else {
      setActiveTab('Estimate');
      localStorage.setItem(ACTIVE_TAB_KEY, 'Estimate');
    }
  };

  const handleEditBillSuccess = () => {
    setEditingBill(null);
    setActiveTab('Sales');
    localStorage.setItem(ACTIVE_TAB_KEY, 'Sales');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onLogout={handleLogout}
          productSubPage={productSubPage}
          onSelectProductSubPage={handleSelectProductSubPage}
        />

        <Box component="main" sx={{ flexGrow: 1, width: '100%', py: 0.5 }}>
          {/* All Customers Tab */}
          {activeTab === 'All Customers' && (
            <>
              {customerSubView === 'add' ? (
                <AddCustomerPage
                  onCancel={() => setCustomerSubView('list')}
                  onSubmitSuccess={() => setCustomerSubView('list')}
                />
              ) : (
                <AllCustomersPage
                  onAddNewCustomer={() => setCustomerSubView('add')}
                  onSelectCustomerForParticular={handleCustomerSelectedForParticular}
                  onSelectCustomerForEstimate={handleCustomerSelectedForEstimate}
                  onSelectCustomerForQuotation={handleCustomerSelectedForQuotation}
                  onEditBill={handleEditBill}
                />
              )}
            </>
          )}

          {/* Sales Tab (Displays all regular / estimate bills) */}
          {activeTab === 'Sales' && (
            <SalesPage
              onNewEstimate={() => handleSelectTab('Estimate')}
              onNewQuotation={() => handleSelectTab('Estimate')}
              onEditBill={handleEditBill}
            />
          )}

          {/* Estimate / Billing Tab (Adds to Sales) */}
          {activeTab === 'Estimate' && (
            <ParticularsPage
              mode="ESTIMATE"
              initialCustomerName={selectedCustomerName}
              editBillData={editingBill}
              onEditSuccess={handleEditBillSuccess}
            />
          )}

          {/* Quotation Tab (Sample products calculation - Does not affect sales) */}
          {activeTab === 'Quotation' && (
            <QuotationPage
              initialCustomerName={selectedCustomerName}
              onNavigateToEstimate={(billData) => {
                setEditingBill(billData);
                setActiveTab('Estimate');
                localStorage.setItem(ACTIVE_TAB_KEY, 'Estimate');
              }}
              onNavigateToSales={() => {
                setActiveTab('Sales');
                localStorage.setItem(ACTIVE_TAB_KEY, 'Sales');
              }}
            />
          )}

          {/* GST Bill Tab */}
          {activeTab === 'GST Bill' && <GstBillPage />}

          {/* Categories Tab */}
          {activeTab === 'Categories' && <CategoriesPage />}

          {/* Price List Tab */}
          {activeTab === 'Price List' && <PriceListPage />}

          {/* Product Master Tab */}
          {activeTab === 'Product' && (
            <ProductsPage
              initialSubPage={productSubPage}
              onSubPageChangeProp={handleSelectProductSubPage}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'Settings' && <SettingsPage />}
        </Box>
        {/* Global Custom Year Restriction Modal Dialog */}
        <YearRestrictionDialog />
      </Box>
    </ThemeProvider>
  );
}

export default App;
