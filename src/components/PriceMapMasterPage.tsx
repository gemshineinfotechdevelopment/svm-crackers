import { type FC } from 'react';
import { ProductPriceMapPage } from './ProductPriceMapPage';
import { type ProductSubPage } from '../types/productSubPages';

interface PriceMapMasterPageProps {
  onSubPageChange: (newPage: ProductSubPage) => void;
  onSelectPriceMapForRate?: (priceMapName: string) => void;
}

export const PriceMapMasterPage: FC<PriceMapMasterPageProps> = ({
  onSubPageChange,
  onSelectPriceMapForRate,
}) => {
  return (
    <ProductPriceMapPage
      currentSubPage="pricemap master"
      onSubPageChange={onSubPageChange}
    />
  );
};
