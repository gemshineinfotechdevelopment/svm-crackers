export type ProductSubPage =
  | 'pricemap master'
  | 'product-Retail sales'
  | 'product-price map'
  | 'product-whole sales';

export interface ProductSubPageConfig {
  id: ProductSubPage;
  label: string;
  shortName: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const PRODUCT_SUB_PAGES: ProductSubPageConfig[] = [
  {
    id: 'pricemap master',
    label: 'pricemap master',
    shortName: 'Price Map Master',
    description: 'Master rate configurations, markup / markdown rules and price tiers',
    color: '#0284C7',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
  {
    id: 'product-Retail sales',
    label: 'product-Retail sales',
    shortName: 'Retail Sales',
    description: 'Retail product catalog, MRP, sales rate & inventory',
    color: '#16A34A',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
  },
  {
    id: 'product-price map',
    label: 'product-price map',
    shortName: 'Product Price Map',
    description: 'Product-to-customer price mapping matrix and custom rate sheets',
    color: '#EA580C',
    badgeBg: '#FFEDD5',
    badgeText: '#C2410C',
  },
  {
    id: 'product-whole sales',
    label: 'product-whole sales',
    shortName: 'Wholesale Sales',
    description: 'Wholesale bulk catalog, dealer slab rates & wholesale inventory',
    color: '#7C3AED',
    badgeBg: '#F3E8FF',
    badgeText: '#6D28D9',
  },
];
