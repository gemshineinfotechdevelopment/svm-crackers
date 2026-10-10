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
import PriceChangeRoundedIcon from '@mui/icons-material/PriceChangeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { ProductSubPageHeader } from './ProductSubPageHeader';
import { type ProductSubPage } from '../types/productSubPages';
import { getActiveBillingYear, YEAR_CHANGE_EVENT } from '../utils/yearContext';

interface PriceMapMasterPageProps {
  onSubPageChange: (newPage: ProductSubPage) => void;
}

interface PriceMapItem {
  id: string;
  ruleCode: string;
  categoryOrItem: string;
  type: 'Category-Wide' | 'Product-Specific';
  baseFormula: string;
  marginPercent: number;
  mappedRate: number;
  effectiveDate: string;
  status: 'Active' | 'Draft';
}

export const PriceMapMasterPage: FC<PriceMapMasterPageProps> = ({ onSubPageChange }) => {
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const [searchTerm, setSearchTerm] = useState('');

  // Sample initial mapping rules for immediate visual structure
  const [rules] = useState<PriceMapItem[]>([
    {
      id: '1',
      ruleCode: 'PMR-001',
      categoryOrItem: 'Single Sound Crackers',
      type: 'Category-Wide',
      baseFormula: 'Cost + 25%',
      marginPercent: 25,
      mappedRate: 125,
      effectiveDate: '01/01/2026',
      status: 'Active',
    },
    {
      id: '2',
      ruleCode: 'PMR-002',
      categoryOrItem: 'Ground Chakkars Special',
      type: 'Product-Specific',
      baseFormula: 'MRP - 15%',
      marginPercent: 15,
      mappedRate: 85,
      effectiveDate: '01/01/2026',
      status: 'Active',
    },
    {
      id: '3',
      ruleCode: 'PMR-003',
      categoryOrItem: 'Flower Pots Deluxe',
      type: 'Category-Wide',
      baseFormula: 'Wholesale Base x 1.30',
      marginPercent: 30,
      mappedRate: 195,
      effectiveDate: '01/01/2026',
      status: 'Active',
    },
    {
      id: '4',
      ruleCode: 'PMR-004',
      categoryOrItem: 'Fancy Aerial Shells 50 Shot',
      type: 'Product-Specific',
      baseFormula: 'Fixed Rate Tier A',
      marginPercent: 20,
      mappedRate: 650,
      effectiveDate: '01/01/2026',
      status: 'Draft',
    },
  ]);

  useEffect(() => {
    const handleYearChange = (e: any) => {
      if (e.detail?.year) setSelectedYear(e.detail.year);
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleYearChange);
    return () => window.removeEventListener(YEAR_CHANGE_EVENT, handleYearChange);
  }, []);

  const filteredRules = rules.filter(
    (r) =>
      r.ruleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.categoryOrItem.toLowerCase().includes(searchTerm.toLowerCase())
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
          currentSubPage="pricemap master"
          onSubPageChange={onSubPageChange}
          year={selectedYear}
          extraRightContent={
            <Button
              startIcon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{
                height: '28px',
                bgcolor: '#0284C7',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                px: 1.2,
                borderRadius: '3px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0369A1' },
              }}
            >
              New Price Map Rule
            </Button>
          }
        />

        {/* Content Area */}
        <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#F0F5FA' }}>
          {/* User Instruction Info Alert Banner */}
          <Alert
            severity="info"
            icon={<PriceChangeRoundedIcon sx={{ fontSize: 20, color: '#0284C7' }} />}
            sx={{
              mb: 1.5,
              borderRadius: '3px',
              border: '1px solid #93C5FD',
              bgcolor: '#EFF6FF',
              fontSize: '12.5px',
              py: 0.5,
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 800, color: '#1E3A8A' }}>
                  📌 Price Map Master (pricemap master) — Page Ready
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: '#334155' }}>
                  This is the dedicated separate page for Price Map Master. Ready for your custom content, pricing columns, formula setup and data requirements!
                </Typography>
              </Box>
              <Chip
                size="small"
                icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                label="Module Active"
                color="primary"
                sx={{ height: '22px', fontSize: '11px', fontWeight: 700 }}
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
              { label: 'Active Price Maps', value: '4 Rules', color: '#0284C7', bg: '#E0F2FE' },
              { label: 'Default Margin', value: '+ 25.00 %', color: '#16A34A', bg: '#DCFCE7' },
              { label: 'Mapped Products', value: '184 Items', color: '#7C3AED', bg: '#F3E8FF' },
              { label: 'Rate Multiplier', value: 'Standard Tier 1', color: '#EA580C', bg: '#FFEDD5' },
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
                <TuneRoundedIcon sx={{ fontSize: 20, color: stat.color, opacity: 0.8 }} />
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
                placeholder="Search rule code, category or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input"
                style={{ width: '280px', fontSize: '12px' }}
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
                Export Excel
              </Button>
              <Tooltip title="Refresh mapping rules" arrow>
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
                  <TableCell sx={{ width: '80px' }}>Rule ID</TableCell>
                  <TableCell>Category / Item Target</TableCell>
                  <TableCell sx={{ width: '150px' }}>Mapping Scope</TableCell>
                  <TableCell sx={{ width: '180px' }}>Formula / Calculation</TableCell>
                  <TableCell sx={{ width: '120px', textAlign: 'right' }}>Margin %</TableCell>
                  <TableCell sx={{ width: '130px', textAlign: 'right' }}>Mapped Rate (₹)</TableCell>
                  <TableCell sx={{ width: '120px' }}>Effective Date</TableCell>
                  <TableCell sx={{ width: '100px', textAlign: 'center' }}>Status</TableCell>
                  <TableCell sx={{ width: '90px', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRules.map((rule, idx) => (
                  <TableRow
                    key={rule.id}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      '& td': { fontSize: '11.5px', py: 0.6, borderBottom: '1px solid #E2E8F0' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#0284C7' }}>{rule.ruleCode}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#0F172A' }}>{rule.categoryOrItem}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={rule.type}
                        sx={{
                          height: '20px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          bgcolor: rule.type === 'Category-Wide' ? '#E0F2FE' : '#FEF3C7',
                          color: rule.type === 'Category-Wide' ? '#0369A1' : '#92400E',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {rule.baseFormula}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>
                      +{rule.marginPercent}%
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                      ₹{rule.mappedRate.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ color: '#64748B' }}>{rule.effectiveDate}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        size="small"
                        label={rule.status}
                        sx={{
                          height: '20px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          bgcolor: rule.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                          color: rule.status === 'Active' ? '#15803D' : '#64748B',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" sx={{ p: 0.2, color: '#0284C7' }}>
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
