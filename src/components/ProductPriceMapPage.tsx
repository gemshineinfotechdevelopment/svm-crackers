import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import { ProductSubPageHeader } from './ProductSubPageHeader';
import { type ProductSubPage } from '../types/productSubPages';
import { getActiveBillingYear, YEAR_CHANGE_EVENT } from '../utils/yearContext';

interface ProductPriceMapPageProps {
  onSubPageChange: (newPage: ProductSubPage) => void;
}

interface ProductPriceMapEntry {
  id: string;
  code: string;
  name: string;
  category: string;
  retailPrice: number;
  wholesalePrice: number;
  mappedRate: number;
  marginPercent: number;
  mappingType: 'Tier A' | 'Tier B' | 'Standard' | 'Custom';
  status: 'Synced' | 'Pending Review';
}

export const ProductPriceMapPage: FC<ProductPriceMapPageProps> = ({ onSubPageChange }) => {
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const [searchTerm, setSearchTerm] = useState('');

  // Sample initial matrix for immediate visual clarity
  const [items] = useState<ProductPriceMapEntry[]>([
    {
      id: '1',
      code: 'PRD-001',
      name: '2 3/4" Kuruvi Crackers (Red)',
      category: 'Single Sound Crackers',
      retailPrice: 45.0,
      wholesalePrice: 28.0,
      mappedRate: 35.0,
      marginPercent: 25.0,
      mappingType: 'Tier A',
      status: 'Synced',
    },
    {
      id: '2',
      code: 'PRD-002',
      name: '3 1/2" Lakshmi Crackers Special',
      category: 'Single Sound Crackers',
      retailPrice: 75.0,
      wholesalePrice: 48.0,
      mappedRate: 58.0,
      marginPercent: 20.8,
      mappingType: 'Tier A',
      status: 'Synced',
    },
    {
      id: '3',
      code: 'PRD-003',
      name: 'Ground Chakkars Big (10 Pcs)',
      category: 'Ground Chakkars',
      retailPrice: 120.0,
      wholesalePrice: 85.0,
      mappedRate: 98.0,
      marginPercent: 15.3,
      mappingType: 'Tier B',
      status: 'Synced',
    },
    {
      id: '4',
      code: 'PRD-004',
      name: 'Flower Pots Giant Deluxe (10 Pcs)',
      category: 'Flower Pots',
      retailPrice: 240.0,
      wholesalePrice: 160.0,
      mappedRate: 195.0,
      marginPercent: 21.9,
      mappingType: 'Standard',
      status: 'Pending Review',
    },
    {
      id: '5',
      code: 'PRD-005',
      name: '12 Shot Rider Aerial Fireworks',
      category: 'Aerial Displays',
      retailPrice: 580.0,
      wholesalePrice: 380.0,
      mappedRate: 460.0,
      marginPercent: 21.0,
      mappingType: 'Custom',
      status: 'Synced',
    },
  ]);

  useEffect(() => {
    const handleYearChange = (e: any) => {
      if (e.detail?.year) setSelectedYear(e.detail.year);
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 1.5 }, bgcolor: '#D9E4F2', minHeight: 'calc(100vh - 70px)' }}>
      {/* Outer Window Card */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          border: '1px solid #9BB3CC',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header with Dropdown */}
        <ProductSubPageHeader
          currentSubPage="product-price map"
          onSubPageChange={onSubPageChange}
          year={selectedYear}
          extraRightContent={
            <Button
              startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                height: '28px',
                bgcolor: '#EA580C',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                px: 1.2,
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#C2410C' },
              }}
            >
              Map Product Rate
            </Button>
          }
        />

        {/* Content Area */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* User Instruction Info Alert Banner */}
          <Alert
            severity="info"
            icon={<AltRouteRoundedIcon sx={{ fontSize: 20, color: '#EA580C' }} />}
            sx={{
              mb: 1.5,
              borderRadius: '3px',
              border: '1px solid #FED7AA',
              bgcolor: '#FFF7ED',
              fontSize: '12.5px',
              py: 0.5,
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#9A3412' }}>
                  📌 Product - Price Map (product-price map) — Page Ready
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: '#334155' }}>
                  This is the dedicated separate page for Product Price Map. Ready for your custom content, mapping matrix, formula adjustments, and data columns!
                </Typography>
              </Box>
              <Chip
                size="small"
                icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                label="Module Active"
                sx={{
                  height: '22px',
                  fontSize: '11px',
                  fontWeight: 700,
                  bgcolor: '#FFEDD5',
                  color: '#C2410C',
                  border: '1px solid #FDBA74',
                }}
              />
            </Box>
          </Alert>

          {/* Quick Metrics Bar */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
              gap: 1,
              mb: 1.5,
            }}
          >
            {[
              { label: 'Total Products Mapped', value: `${items.length} Products`, color: '#EA580C', bg: '#FFEDD5' },
              { label: 'Avg Mapped Margin', value: '+ 20.8 %', color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Pricing Tiers Active', value: '4 Tiers', color: '#0284C7', bg: '#E0F2FE' },
              { label: 'Pending Rate Sync', value: '1 Item', color: '#D97706', bg: '#FEF3C7' },
            ].map((stat, i) => (
              <Box
                key={i}
                sx={{
                  bgcolor: '#FFFFFF',
                  border: '1px solid #B0C4DE',
                  borderRadius: '3px',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B' }}>
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 800, color: stat.color }}>
                    {stat.value}
                  </Typography>
                </Box>
                <CompareArrowsRoundedIcon sx={{ fontSize: 20, color: stat.color, opacity: 0.8 }} />
              </Box>
            ))}
          </Box>

          {/* Control Bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
              bgcolor: '#FFFFFF',
              border: '1px solid #B0C4DE',
              borderRadius: '3px',
              p: 0.8,
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
              <input
                type="text"
                placeholder="Search code, product or category in price map..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input"
                style={{ width: '320px', fontSize: '12px' }}
              />
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 13 }} />}
                size="small"
                sx={{
                  height: '28px',
                  bgcolor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  px: 1,
                  borderRadius: '3px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#E2E8F0' },
                }}
              >
                Export Matrix
              </Button>
              <Tooltip title="Refresh price map data" arrow>
                <IconButton size="small" sx={{ p: 0.4, border: '1px solid #CBD5E1' }}>
                  <RefreshRoundedIcon sx={{ fontSize: 16, color: '#1E3A8A' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Table Container */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid #A8C2DC',
              borderRadius: '3px',
              maxHeight: 'calc(100vh - 290px)',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: '#1E3A8A', color: '#FFFFFF', fontWeight: 800, fontSize: '11.5px', py: 0.7 } }}>
                  <TableCell sx={{ width: '90px' }}>Item Code</TableCell>
                  <TableCell>Product Description</TableCell>
                  <TableCell sx={{ width: '160px' }}>Category</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'right' }}>Retail Rate (₹)</TableCell>
                  <TableCell sx={{ width: '130px', textAlign: 'right' }}>Wholesale Rate (₹)</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'center' }}>Map Tier</TableCell>
                  <TableCell sx={{ width: '130px', textAlign: 'right' }}>Mapped Price (₹)</TableCell>
                  <TableCell sx={{ width: '100px', textAlign: 'right' }}>Margin %</TableCell>
                  <TableCell sx={{ width: '110px', textAlign: 'center' }}>Sync Status</TableCell>
                  <TableCell sx={{ width: '80px', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      '& td': { fontSize: '11.5px', py: 0.6, borderBottom: '1px solid #E2E8F0' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#EA580C' }}>{item.code}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>{item.name}</TableCell>
                    <TableCell sx={{ color: '#475569' }}>{item.category}</TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      ₹{item.retailPrice.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600, color: '#7C3AED' }}>
                      ₹{item.wholesalePrice.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={item.mappingType}
                        sx={{
                          height: '20px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          bgcolor: '#FFEDD5',
                          color: '#C2410C',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#0F172A', bgcolor: '#FEF3C7' }}>
                      ₹{item.mappedRate.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      +{item.marginPercent}%
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={item.status}
                        sx={{
                          height: '20px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          bgcolor: item.status === 'Synced' ? '#DCFCE7' : '#FEF3C7',
                          color: item.status === 'Synced' ? '#15803D' : '#B45309',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" sx={{ p: 0.2, color: '#EA580C' }}>
                          <ModeEditOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ p: 0.2, color: '#DC2626' }}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};
