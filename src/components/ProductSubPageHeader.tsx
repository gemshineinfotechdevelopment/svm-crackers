import React, { type FC } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Tooltip,
} from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PriceChangeRoundedIcon from '@mui/icons-material/PriceChangeRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import {
  PRODUCT_SUB_PAGES,
  type ProductSubPage,
} from '../types/productSubPages';

interface ProductSubPageHeaderProps {
  currentSubPage: ProductSubPage;
  onSubPageChange: (newPage: ProductSubPage) => void;
  year?: number;
  extraRightContent?: React.ReactNode;
}

export const ProductSubPageHeader: FC<ProductSubPageHeaderProps> = ({
  currentSubPage,
  onSubPageChange,
  year,
  extraRightContent,
}) => {
  const getSubPageIcon = (id: ProductSubPage) => {
    switch (id) {
      case 'pricemap master':
        return <PriceChangeRoundedIcon sx={{ fontSize: 16, color: '#0284C7' }} />;
      case 'product-Retail sales':
        return <ShoppingCartRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />;
      case 'product-price map':
        return <AltRouteRoundedIcon sx={{ fontSize: 16, color: '#EA580C' }} />;
      case 'product-whole sales':
        return <StorefrontRoundedIcon sx={{ fontSize: 16, color: '#7C3AED' }} />;
    }
  };

  const currentConfig = PRODUCT_SUB_PAGES.find((p) => p.id === currentSubPage) || PRODUCT_SUB_PAGES[0];

  return (
    <Box sx={{ width: '100%', mb: 1 }}>
      {/* Top Main ERP Header Bar with Dropdown Selector */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
          border: '1px solid #A8C2DC',
          borderRadius: '4px 4px 0 0',
          px: 1.5,
          py: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Left: Product Master Title + Dropdown */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Inventory2RoundedIcon sx={{ fontSize: 20, color: '#1E40AF' }} />
            <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.01em' }}>
              PRODUCT MASTER
            </Typography>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#64748B' }}>
              /
            </Typography>
          </Box>

          {/* User Requested Subpage Dropdown */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
              Page / Module:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 230 }}>
              <Select
                value={currentSubPage}
                onChange={(e) => onSubPageChange(e.target.value as ProductSubPage)}
                IconComponent={ArrowDropDownRoundedIcon}
                sx={{
                  height: '32px',
                  bgcolor: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#0F172A',
                  borderRadius: '3px',
                  border: '1px solid #94A3B8',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&:hover': {
                    borderColor: '#2563EB',
                    bgcolor: '#F8FAFC',
                  },
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                    py: 0.5,
                  },
                }}
              >
                {PRODUCT_SUB_PAGES.map((page) => (
                  <MenuItem
                    key={page.id}
                    value={page.id}
                    sx={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      py: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&.Mui-selected': {
                        bgcolor: page.badgeBg,
                        fontWeight: 800,
                        color: page.badgeText,
                      },
                    }}
                  >
                    {getSubPageIcon(page.id)}
                    <Box>
                      <Typography sx={{ fontSize: '12.5px', fontWeight: 700 }}>
                        {page.label}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Active Badge */}
          <Chip
            size="small"
            label={currentConfig.shortName}
            sx={{
              height: '24px',
              fontSize: '11px',
              fontWeight: 800,
              bgcolor: currentConfig.badgeBg,
              color: currentConfig.badgeText,
              border: `1px solid ${currentConfig.color}40`,
            }}
          />
        </Box>

        {/* Right side: Year indicator & extra actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {extraRightContent}
          {year && (
            <Chip
              size="small"
              label={`FY: ${year}`}
              sx={{
                height: '24px',
                fontSize: '11px',
                fontWeight: 700,
                bgcolor: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Subpage Fast-Switch Navigation Tabs / Bar */}
      <Box
        sx={{
          bgcolor: '#F8FAFC',
          borderLeft: '1px solid #A8C2DC',
          borderRight: '1px solid #A8C2DC',
          borderBottom: '1px solid #CBD5E1',
          px: 1.5,
          py: 0.6,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
          Quick Switch:
        </Typography>
        {PRODUCT_SUB_PAGES.map((page) => {
          const isActive = currentSubPage === page.id;
          return (
            <Tooltip key={page.id} title={page.description} arrow>
              <Box
                onClick={() => onSubPageChange(page.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.6,
                  px: 1.2,
                  py: 0.4,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 800 : 600,
                  bgcolor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? page.color : '#475569',
                  border: isActive ? `1px solid ${page.color}` : '1px solid #E2E8F0',
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isActive ? '#FFFFFF' : '#EDF4FB',
                    borderColor: page.color,
                  },
                }}
              >
                {getSubPageIcon(page.id)}
                <span>{page.label}</span>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
