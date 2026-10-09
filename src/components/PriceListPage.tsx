import { useState, useEffect, useMemo, useRef, type FC, type ChangeEvent, type DragEvent } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  LinearProgress,
  InputBase,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Grid,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Collapse,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ModeEditOutlineRoundedIcon from '@mui/icons-material/ModeEditOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import FilePresentRoundedIcon from '@mui/icons-material/FilePresentRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { PriceListsApi, CategoriesApi } from '../services/api';
import { getStoredSettings } from './SettingsPage';
import {
  getActiveBillingYear,
  setActiveBillingYear,
  getStandardYearOptions,
  YEAR_CHANGE_EVENT,
} from '../utils/yearContext';
import { getSelectedBillYear } from '../utils/billYearUtils';
import { triggerYearRestrictionDialog } from './YearRestrictionDialog';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PriceItem {
  _id?: string;
  id?: string;
  slNo: number;
  itemName: string;
  category: string;
  unit: string;
  mrp: number;
  discountPercent?: number;
  rate: number;
  effectiveDate?: string;
  batchName?: string;
  year?: number;
}

export interface UploadedPriceDoc {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'spreadsheet';
  size: string;
  uploadDate: string;
  dataUrl?: string;
}

export const PriceListPage: FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [categories, setCategories] = useState<{ name: string; color?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'documents'>('table');
  const [showUploadZone, setShowUploadZone] = useState<boolean>(false);

  // Year state
  const [selectedYear, setSelectedYear] = useState<number>(getActiveBillingYear);
  const yearOptions = useMemo(() => getStandardYearOptions(), []);

  // File Upload & Preview States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Spreadsheet / PDF / Image Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<Partial<PriceItem>[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadBatchName, setUploadBatchName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingPdfDataUrl, setPendingPdfDataUrl] = useState<string>('');

  // OCR Processing States (For Image Rate Cards & Scanned PDFs)
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');

  // Paste Text Price List Modal State
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTextContent, setPasteTextContent] = useState('');

  // PDF & Image Upload Confirmation Modal State
  const [pendingDocUpload, setPendingDocUpload] = useState<UploadedPriceDoc | null>(null);
  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');

  // PDF & Image Full Viewer Modal State
  const [viewDocModalOpen, setViewDocModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<UploadedPriceDoc | null>(null);

  // Quick product entry alongside image in modal
  const [quickItemName, setQuickItemName] = useState('');
  const [quickCategory, setQuickCategory] = useState('General');
  const [quickRate, setQuickRate] = useState('');
  const [quickUnit, setQuickUnit] = useState('Box');
  const [quickSaving, setQuickSaving] = useState(false);

  // Toast Feedback State
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Uploaded Documents List (Persisted in localStorage)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedPriceDoc[]>(() => {
    try {
      const saved = localStorage.getItem('apsara_uploaded_price_docs') || localStorage.getItem('varun_uploaded_price_docs') || localStorage.getItem('dheeksha_uploaded_price_docs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Manual Add / Edit Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [formSlNo, setFormSlNo] = useState<number>(1);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formUnit, setFormUnit] = useState('Box');
  const [formMrp, setFormMrp] = useState<string>('0');
  const [formDiscount, setFormDiscount] = useState<string>('0');
  const [formRate, setFormRate] = useState<string>('0');
  const [savingItem, setSavingItem] = useState(false);

  // Save docs list to localStorage
  const saveDocsList = (docs: UploadedPriceDoc[]) => {
    setUploadedDocs(docs);
    try {
      localStorage.setItem('apsara_uploaded_price_docs', JSON.stringify(docs));
      localStorage.removeItem('varun_uploaded_price_docs');
      localStorage.removeItem('dheeksha_uploaded_price_docs');
    } catch (err) {
      console.warn('Storage limit reached for local docs:', err);
    }
  };

  // Fetch initial data for selected year
  const fetchData = async (targetYear: number | string = selectedYear) => {
    try {
      setLoading(true);
      const effectiveYear = targetYear || getSelectedBillYear();
      const [priceData, catData] = await Promise.all([
        PriceListsApi.getAll({ year: effectiveYear }),
        CategoriesApi.getAll().catch(() => []),
      ]);

      let mergedItems: PriceItem[] = [];
      if (Array.isArray(priceData)) {
        mergedItems = priceData.map((item: any) => ({
          ...item,
          year: item.year || effectiveYear,
        }));
      }

      setItems(mergedItems);
      if (Array.isArray(catData) && catData.length > 0) {
        setCategories(catData.map((c) => ({ name: c.name, color: c.color })));
      }
    } catch (err) {
      console.error('Failed to load price list data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    setActiveBillingYear(newYear);
    fetchData(newYear);
  };

  useEffect(() => {
    fetchData(selectedYear);

    const handleGlobalYear = (e: any) => {
      const year = e?.detail?.year ? Number(e.detail.year) : (typeof getSelectedBillYear === 'function' ? Number(getSelectedBillYear()) : undefined);
      if (year && year !== selectedYear) {
        setSelectedYear(year);
        fetchData(year);
      } else {
        fetchData();
      }
    };
    window.addEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
    window.addEventListener('apsara_bill_year_changed', handleGlobalYear);
    return () => {
      window.removeEventListener(YEAR_CHANGE_EVENT, handleGlobalYear);
      window.removeEventListener('apsara_bill_year_changed', handleGlobalYear);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered price items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.itemName.toLowerCase().includes(term) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        String(item.slNo).includes(term) ||
        String(item.rate).includes(term);
      return matchesCat && matchesSearch;
    });
  }, [items, selectedCategory, searchTerm]);

  // Common Tamil Cracker terms dictionary for English conversion
  const TAMIL_CRACKER_WORDS: Record<string, string> = {
    'குருவி': 'Kuruvi',
    'சங்கு': 'Ground',
    'சக்கரம்': 'Chakkar',
    'மத்தாப்பு': 'Sparklers',
    'புஸ்வாணம்': 'Flower Pots',
    'ராக்கெட்': 'Rocket',
    'ஆட்டம் பாம்': 'Atom Bomb',
    'ஹைட்ரோ பாம்': 'Hydro Bomb',
    'பாம்': 'Bomb',
    'சரவெடி': 'Garland Crackers',
    'வாலா': 'Wala',
    'கிப்ட்': 'Gift',
    'பாக்ஸ்': 'Box',
    'ஷாட்': 'Shot',
    'ஷாட்ஸ்': 'Shots',
    'சிவப்பு': 'Red',
    'பச்சை': 'Green',
    'மஞ்சள்': 'Yellow',
    'கலர்': 'Color',
    'ஸ்பெஷல்': 'Special',
    'டீலக்ஸ்': 'Deluxe',
    'பெரியது': 'Big',
    'சிறியது': 'Small',
    'ஜயன்ட்': 'Giant',
    'ஹைட்ரோ': 'Hydro',
    'லட்சுமி': 'Lakshmi',
    'கணேஷ்': 'Ganesh',
    'மாயாஜால்': 'Mayajal',
    'பென்சில்': 'Pencil',
    'ஸ்டார்': 'Star',
    'கேப்': 'Cap',
    'வெடி': 'Crackers',
    'பட்டாசு': 'Crackers',
    'பட்டாசுகள்': 'Crackers',
  };

  const ensureEnglishText = (text: string): string => {
    if (!text) return '';
    let str = String(text).trim();

    if (/[a-zA-Z]/.test(str)) {
      str = str.replace(/[\u0B80-\u0BFF]+/g, ' ');
    } else if (/[\u0B80-\u0BFF]/.test(str)) {
      for (const [tam, eng] of Object.entries(TAMIL_CRACKER_WORDS)) {
        str = str.replace(new RegExp(tam, 'g'), eng);
      }
      str = str.replace(/[\u0B80-\u0BFF]+/g, ' ');
    }

    str = str
      .replace(/\(\s*\)/g, ' ')
      .replace(/\[\s*\]/g, ' ')
      .replace(/\{\s*\}/g, ' ')
      .replace(/[\/\\|:_\-~*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return str;
  };

  const parseTextLinesToItems = (rawText: string): Partial<PriceItem>[] => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: Partial<PriceItem>[] = [];
    let currentCategory = 'One Sound Crackers';
    let nextSlNo = 1;

    const knownCats = [
      'ONE SOUND', 'SOUND CRACKERS', 'SPARKLERS', 'CHAKKARS', 'GROUND CHAKKAR',
      'FLOWER POTS', 'ROCKETS', 'BOMBS', 'HYDRO BOMB', 'ATOM BOMB', 'GARLANDS',
      'MATCHES', 'FANCY FOUNTAINS', 'FANCY NOVELTIES', 'GIFT BOXES', 'KIDS SPECIAL',
      'AERIAL SHOTS', 'REPEATERS', 'COLOR SMOKE', 'CRACKERS', 'ROLL CAPS', 'CORA CRACKERS',
      'ELECTRIC SPARKLERS', 'COLOR SPARKLERS', 'TWINKLING STARS'
    ];

    const unitRegex = /\b(\d+\s*(?:pcs|box|pkt|tin|jar|bag|roll|cases|pkt\.)|pcs|box|pkt|tin|jar|bag|roll|cases|pkt\.)\b/i;

    for (const rawLine of lines) {
      const line = rawLine.replace(/[|│]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!line || line.length < 2) continue;

      const lower = line.toLowerCase();
      if (
        lower.includes('rate list') ||
        lower.includes('price list') ||
        lower.includes('s.no') ||
        lower.includes('sl.no') ||
        lower.includes('item name') ||
        lower.includes('particulars') ||
        lower.includes('page ') ||
        lower.includes('contact') ||
        lower.includes('phone') ||
        lower.includes('gstin') ||
        lower.includes('terms &') ||
        lower.includes('manjula') ||
        lower.includes('svm') ||
        lower.includes('apsara')
      ) {
        for (const cat of knownCats) {
          if (line.toUpperCase().includes(cat)) {
            currentCategory = ensureEnglishText(line.replace(/[:\-_~*|]/g, '').trim()) || 'One Sound Crackers';
            break;
          }
        }
        continue;
      }

      const hasDigits = /\d/.test(line);
      if (!hasDigits && line.length >= 3 && line.length <= 50) {
        const catCandidate = ensureEnglishText(line.replace(/[:\-_~*|]/g, '').trim());
        if (catCandidate.length >= 2) {
          currentCategory = catCandidate;
        }
        continue;
      }

      const tokens = line.split(' ').filter(Boolean);
      if (tokens.length < 2) continue;

      let slNo = nextSlNo;
      let startIndex = 0;

      const firstMatch = tokens[0].match(/^(\d{1,4})[\.\)\-]?$/);
      if (firstMatch) {
        slNo = parseInt(firstMatch[1], 10) || nextSlNo;
        startIndex = 1;
      }

      const unitMatch = line.match(unitRegex);
      const unit = unitMatch ? unitMatch[0] : 'Box';

      const numericTokens: number[] = [];
      const textTokens: string[] = [];

      for (let i = startIndex; i < tokens.length; i++) {
        const tok = tokens[i];
        const clean = tok.replace(/[₹,Rs\.\/]/gi, '').trim();
        const num = parseFloat(clean);
        if (!isNaN(num) && /^\d+(\.\d+)?$/.test(clean) && num > 0) {
          numericTokens.push(num);
        } else {
          textTokens.push(tok);
        }
      }

      if (numericTokens.length === 0) continue;

      let rate = 0;
      let mrp = 0;

      if (numericTokens.length === 1) {
        rate = numericTokens[0];
        mrp = rate;
      } else {
        const lastVal = numericTokens[numericTokens.length - 1];
        const firstVal = numericTokens[0];
        if (firstVal > lastVal && lastVal > 0) {
          mrp = firstVal;
          rate = lastVal;
        } else {
          rate = lastVal;
          mrp = firstVal;
        }
      }

      let itemName = textTokens
        .filter((t) => !unitRegex.test(t))
        .join(' ')
        .replace(/[:\-_~*|]/g, '')
        .trim();

      if (!itemName || itemName.length < 2) {
        itemName = line
          .replace(unitRegex, '')
          .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
          .replace(/[:\-_~*|]/g, '')
          .trim();
      }

      itemName = ensureEnglishText(itemName);

      if (itemName && itemName.length >= 2 && rate > 0) {
        parsed.push({
          slNo: slNo || nextSlNo,
          itemName,
          category: ensureEnglishText(currentCategory) || 'General',
          unit: unit || 'Box',
          mrp: mrp || rate,
          discountPercent: mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0,
          rate,
        });
        nextSlNo++;
      }
    }

    return parsed;
  };

  const recognizeImageWithOcr = async (
    imageSource: string | File | Blob | HTMLCanvasElement,
    onProgress?: (p: number, status: string) => void
  ): Promise<string> => {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(Math.round(m.progress * 100), `Reading rate card text... ${Math.round(m.progress * 100)}%`);
        } else if (m.status) {
          onProgress?.(25, `${m.status}...`);
        }
      },
    });
    return result.data.text || '';
  };

  const processPdfDocument = async (
    arrayBuffer: ArrayBuffer,
    onProgress?: (p: number, status: string) => void
  ): Promise<Partial<PriceItem>[]> => {
    try {
      const uint8Copy = new Uint8Array(arrayBuffer.slice(0));
      const loadingTask = pdfjsLib.getDocument({ data: uint8Copy });
      const pdfDoc = await loadingTask.promise;
      let allLines = '';
      let hasText = false;

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const rawItems = textContent.items as Array<{ str: string; transform: number[] }>;

        if (rawItems && rawItems.length > 0) {
          const lineMap = new Map<number, Array<{ str: string; x: number }>>();
          for (const item of rawItems) {
            const text = (item.str || '').trim();
            if (!text) continue;
            const x = item.transform[4];
            const y = Math.round(item.transform[5]);

            let matchedKey: number | null = null;
            for (const existingY of lineMap.keys()) {
              if (Math.abs(existingY - y) <= 4) {
                matchedKey = existingY;
                break;
              }
            }

            if (matchedKey !== null) {
              lineMap.get(matchedKey)!.push({ str: text, x });
            } else {
              lineMap.set(y, [{ str: text, x }]);
            }
          }

          const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
          for (const y of sortedY) {
            const lineTokens = lineMap.get(y)!.sort((a, b) => a.x - b.x);
            const fullLineText = lineTokens.map((t) => t.str).join(' ').trim();
            if (fullLineText) {
              allLines += fullLineText + '\n';
              hasText = true;
            }
          }
        }
      }

      if (hasText) {
        const parsed = parseTextLinesToItems(allLines);
        if (parsed.length > 0) {
          return parsed;
        }
      }

      const totalPages = Math.min(pdfDoc.numPages, 5);
      let ocrFullText = '';

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        onProgress?.(
          Math.round((pageNum / totalPages) * 100),
          `Scanning PDF page ${pageNum} of ${totalPages} with AI OCR...`
        );
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
          const pageText = await recognizeImageWithOcr(canvas, onProgress);
          ocrFullText += '\n' + pageText;
        }
      }

      return parseTextLinesToItems(ocrFullText);
    } catch (pdfErr) {
      console.error('PDF document processing error:', pdfErr);
      return [];
    }
  };

  const parseSpreadsheetWorkbook = (workbook: XLSX.WorkBook): Partial<PriceItem>[] => {
    const allParsedItems: Partial<PriceItem>[] = [];
    let globalSlNo = 1;

    const isTitleNoise = (text: string) => {
      const l = text.toLowerCase();
      return (
        l.includes('price list') ||
        l.includes('rate list') ||
        l.includes('gstin') ||
        l.includes('phone') ||
        l.includes('contact') ||
        l.includes('mobile') ||
        l.includes('terms &') ||
        l.includes('conditions') ||
        l.includes('all rates are') ||
        l.includes('discount list') ||
        l.includes('total') ||
        l.includes('grand total') ||
        l.includes('manjula') ||
        l.includes('svm') ||
        l.includes('apsara')
      );
    };

    const detectCategoryHeading = (row: any[]): string | null => {
      const nonEmptyCells = row
        .map((c, i) => ({ val: String(c).trim(), idx: i }))
        .filter((item) => item.val.length > 0);

      if (nonEmptyCells.length === 0) return null;

      const rowText = nonEmptyCells.map((c) => c.val.toLowerCase()).join(' ');

      if (
        (rowText.includes('item name') || rowText.includes('product') || rowText.includes('particular')) &&
        (rowText.includes('rate') || rowText.includes('mrp') || rowText.includes('price') || rowText.includes('amount'))
      ) {
        return null;
      }

      const numericCells = nonEmptyCells.filter((c) => {
        const clean = c.val.replace(/[₹,Rs\.\/\s]/gi, '');
        const num = parseFloat(clean);
        return !isNaN(num) && num > 0 && /^\d+(\.\d+)?$/.test(clean);
      });

      if (numericCells.length === 0 || (numericCells.length === 1 && nonEmptyCells.length <= 2)) {
        let textCandidate = nonEmptyCells
          .map((c) => c.val)
          .join(' ')
          .replace(/^[\d\.\-\)\:]+/, '')
          .replace(/[:\-_~*|=#]+/g, ' ')
          .trim();

        textCandidate = ensureEnglishText(textCandidate);

        if (textCandidate.length >= 2 && textCandidate.length <= 60 && !isTitleNoise(textCandidate)) {
          return textCandidate;
        }
      }

      return null;
    };

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawRows || rawRows.length === 0) continue;

      let currentCategory = sheetName.toLowerCase().startsWith('sheet') ? 'General' : ensureEnglishText(sheetName.trim()) || 'General';
      let slCol = -1;
      let engNameCol = -1;
      let nameCol = -1;
      let catCol = -1;
      let unitCol = -1;
      let mrpCol = -1;
      let rateCol = -1;
      let discCol = -1;

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !Array.isArray(row) || row.every((c) => String(c).trim() === '')) {
          continue;
        }

        const lowerCells = row.map((c) => String(c).toLowerCase().trim());
        const isTableHeaderRow =
          lowerCells.some((c) => c.includes('product') || c.includes('item') || c.includes('particular') || c === 'name') &&
          lowerCells.some((c) => c.includes('rate') || c.includes('price') || c.includes('mrp') || c.includes('amount'));

        if (isTableHeaderRow) {
          lowerCells.forEach((c, idx) => {
            if (c.includes('sl') || c.includes('s.no') || c === 'no' || c === '#') slCol = idx;
            else if (c.includes('eng') || c.includes('english')) engNameCol = idx;
            else if (c.includes('product') || c.includes('item') || c.includes('particular') || c === 'name') {
              if (nameCol === -1 || !c.includes('tamil')) nameCol = idx;
            }
            else if (c.includes('cat') || c.includes('group') || c.includes('type')) catCol = idx;
            else if (c.includes('unit') || c.includes('content') || c.includes('packing') || c.includes('pkg') || c.includes('per')) unitCol = idx;
            else if (c.includes('mrp') || c.includes('m.r.p') || c.includes('gross') || c.includes('box rate')) mrpCol = idx;
            else if (c.includes('disc') || c.includes('%')) discCol = idx;
            else if (c.includes('net') || c.includes('rate') || c.includes('price') || c.includes('selling') || c.includes('final')) rateCol = idx;
          });
          continue;
        }

        const detectedHeading = detectCategoryHeading(row);
        if (detectedHeading) {
          currentCategory = detectedHeading;
          continue;
        }

        let itemName = '';
        let itemCat = currentCategory;
        let itemUnit = 'Box';
        let itemMrp = 0;
        let itemRate = 0;
        let itemDisc = 0;
        let itemSlNo = globalSlNo;

        const activeNameCol = engNameCol !== -1 ? engNameCol : nameCol;

        if (activeNameCol !== -1 && row[activeNameCol] !== undefined && String(row[activeNameCol]).trim() !== '') {
          itemName = ensureEnglishText(String(row[activeNameCol]));

          if (!itemName || !/[a-zA-Z]/.test(itemName)) {
            for (let cIdx = 0; cIdx < row.length; cIdx++) {
              if (cIdx === slCol || cIdx === rateCol || cIdx === mrpCol || cIdx === unitCol) continue;
              const cellVal = String(row[cIdx] || '').trim();
              if (/[a-zA-Z]{2,}/.test(cellVal)) {
                const candidate = ensureEnglishText(cellVal);
                if (candidate.length >= 2) {
                  itemName = candidate;
                  break;
                }
              }
            }
          }

          if (slCol !== -1 && row[slCol]) itemSlNo = Number(String(row[slCol]).replace(/[^\d]/g, '')) || globalSlNo;
          if (catCol !== -1 && row[catCol] && String(row[catCol]).trim() !== '') {
            itemCat = ensureEnglishText(String(row[catCol])) || currentCategory;
            currentCategory = itemCat;
          }
          if (unitCol !== -1 && row[unitCol]) itemUnit = ensureEnglishText(String(row[unitCol])) || 'Box';
          if (mrpCol !== -1 && row[mrpCol]) itemMrp = Number(String(row[mrpCol]).replace(/[^\d.]/g, '')) || 0;
          if (rateCol !== -1 && row[rateCol]) itemRate = Number(String(row[rateCol]).replace(/[^\d.]/g, '')) || 0;
          if (discCol !== -1 && row[discCol]) itemDisc = Number(String(row[discCol]).replace(/[^\d.]/g, '')) || 0;
        } else {
          const nonEmpty = row.map((c, i) => ({ val: String(c).trim(), idx: i })).filter((x) => x.val.length > 0);
          const textTokens: string[] = [];
          const numTokens: number[] = [];

          for (const cell of nonEmpty) {
            const clean = cell.val.replace(/[₹,Rs\.\/\s]/gi, '').trim();
            const num = parseFloat(clean);
            if (!isNaN(num) && /^\d+(\.\d+)?$/.test(clean) && num > 0) {
              numTokens.push(num);
            } else {
              textTokens.push(cell.val);
            }
          }

          if (textTokens.length > 0 && numTokens.length > 0) {
            const engText = textTokens.filter((t) => /[a-zA-Z]/.test(t)).join(' ');
            const rawCand = engText || textTokens.join(' ');
            itemName = ensureEnglishText(rawCand);

            if (numTokens.length === 1) {
              itemRate = numTokens[0];
              itemMrp = itemRate;
            } else {
              itemMrp = numTokens[0];
              itemRate = numTokens[numTokens.length - 1];
            }
          }
        }

        if (!itemRate && itemMrp > 0) {
          itemRate = itemDisc > 0 ? itemMrp - (itemMrp * itemDisc) / 100 : itemMrp;
        }

        if (itemName && itemName.length >= 2 && !isTitleNoise(itemName) && (itemRate > 0 || itemMrp > 0)) {
          allParsedItems.push({
            slNo: itemSlNo || globalSlNo,
            itemName,
            category: itemCat || currentCategory || 'General',
            unit: itemUnit || 'Box',
            mrp: itemMrp || itemRate,
            discountPercent: itemDisc || (itemMrp > itemRate ? Math.round(((itemMrp - itemRate) / itemMrp) * 100) : 0),
            rate: itemRate,
          });
          globalSlNo++;
        }
      }
    }

    return allParsedItems;
  };

  const processUploadedFile = async (file: File) => {
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    if (['xlsx', 'xls', 'csv'].includes(fileExt)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const parsed = parseSpreadsheetWorkbook(workbook);

          if (parsed.length === 0) {
            alert('No valid items found. Please ensure your sheet has product names and rates/MRPs.');
            return;
          }

          const uniqueCategories = Array.from(new Set(parsed.map((p) => p.category).filter(Boolean)));

          setPendingPdfDataUrl('');
          setPreviewItems(parsed);
          setUploadFileName(file.name);
          setUploadBatchName(file.name.replace(/\.[^/.]+$/, ''));
          setUploadModalOpen(true);
          setToast({
            open: true,
            message: `Excel analyzed: Found ${parsed.length} products across ${uniqueCategories.length} categories!`,
            severity: 'success',
          });
        } catch (err) {
          console.error('File parsing error:', err);
          alert('Failed to parse spreadsheet.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (fileExt === 'pdf' || file.type === 'application/pdf') {
      try {
        setOcrLoading(true);
        setOcrProgress(15);
        setOcrStatusText('Analyzing and reading PDF rate card...');

        const arrayBuffer = await file.arrayBuffer();

        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (ev) => resolve(ev.target?.result as string);
          r.readAsDataURL(file);
        });
        setPendingPdfDataUrl(dataUrl);

        const extracted = await processPdfDocument(arrayBuffer, (p, status) => {
          setOcrProgress(p);
          setOcrStatusText(status);
        });

        setOcrLoading(false);

        if (extracted.length > 0) {
          setPreviewItems(extracted);
          setUploadFileName(file.name);
          setUploadBatchName(file.name.replace(/\.[^/.]+$/, ''));
          setUploadModalOpen(true);
          setToast({
            open: true,
            message: `Successfully extracted ${extracted.length} products from PDF "${file.name}"!`,
            severity: 'success',
          });
        } else {
          const newDoc: UploadedPriceDoc = {
            id: `doc-${Date.now()}`,
            name: fileName,
            type: 'pdf',
            size: fileSizeFormatted,
            uploadDate: new Date().toLocaleDateString('en-GB'),
            dataUrl,
          };
          setPendingDocUpload(newDoc);
          setDocTitle(fileName.replace(/\.[^/.]+$/, ''));
          setDocUploadModalOpen(true);
        }
      } catch (err: any) {
        setOcrLoading(false);
        console.error('PDF processing failed:', err);
        alert('Could not parse PDF. Saved to gallery.');
      }
      return;
    }

    if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(fileExt)) {
      try {
        setOcrLoading(true);
        setOcrProgress(10);
        setOcrStatusText('Starting AI OCR on rate card image...');

        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (ev) => resolve(ev.target?.result as string);
          r.readAsDataURL(file);
        });
        setPendingPdfDataUrl(dataUrl);

        const ocrText = await recognizeImageWithOcr(dataUrl, (p, status) => {
          setOcrProgress(p);
          setOcrStatusText(status);
        });

        const extracted = parseTextLinesToItems(ocrText);
        setOcrLoading(false);

        if (extracted.length > 0) {
          setPreviewItems(extracted);
          setUploadFileName(file.name);
          setUploadBatchName(file.name.replace(/\.[^/.]+$/, ''));
          setUploadModalOpen(true);
          setToast({
            open: true,
            message: `AI OCR detected ${extracted.length} cracker items from photo "${file.name}"!`,
            severity: 'success',
          });
        } else {
          const newDoc: UploadedPriceDoc = {
            id: `doc-${Date.now()}`,
            name: fileName,
            type: 'image',
            size: fileSizeFormatted,
            uploadDate: new Date().toLocaleDateString('en-GB'),
            dataUrl,
          };
          setPendingDocUpload(newDoc);
          setDocTitle(fileName.replace(/\.[^/.]+$/, ''));
          setDocUploadModalOpen(true);
        }
      } catch (err: any) {
        setOcrLoading(false);
        console.error('Image OCR failed:', err);
        alert('Failed to read text from image. Saved to gallery.');
      }
      return;
    }

    alert('Unsupported file format. Please upload an Excel (.xlsx/.xls), CSV (.csv), PDF (.pdf), or Image (.jpg/.png).');
  };

  const handleExtractFromPasteText = () => {
    if (!pasteTextContent.trim()) {
      alert('Please paste some price list text first');
      return;
    }
    const extracted = parseTextLinesToItems(pasteTextContent);
    if (extracted.length === 0) {
      alert('Could not find product lines with rates. Ensure each line has a product name and price/rate (e.g. 2 3/4 Kuruvi 45).');
      return;
    }
    setPreviewItems(extracted);
    setUploadFileName(`Pasted-Text-${new Date().toLocaleTimeString()}`);
    setUploadBatchName(`Pasted List ${new Date().toLocaleDateString('en-GB')}`);
    setPasteModalOpen(false);
    setPasteTextContent('');
    setUploadModalOpen(true);
    setToast({
      open: true,
      message: `Extracted ${extracted.length} products from pasted text!`,
      severity: 'success',
    });
  };

  const handleUpdatePreviewItem = (index: number, field: keyof PriceItem, value: any) => {
    setPreviewItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeletePreviewItem = (index: number) => {
    setPreviewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPreviewRow = () => {
    const nextSl = previewItems.length > 0 ? (previewItems[previewItems.length - 1]?.slNo || 0) + 1 : 1;
    setPreviewItems((prev) => [
      ...prev,
      {
        slNo: nextSl,
        itemName: '',
        category: categories[0]?.name || 'One Sound Crackers',
        unit: 'Box',
        mrp: 0,
        rate: 0,
      },
    ]);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleConfirmSpreadsheetUpload = async () => {
    if (previewItems.length === 0) return;

    try {
      setUploading(true);
      await PriceListsApi.bulkImport({
        items: previewItems,
        batchName: uploadBatchName || uploadFileName,
        replaceExisting,
        year: selectedYear,
      });

      const newDoc: UploadedPriceDoc = {
        id: `doc-${Date.now()}`,
        name: uploadFileName,
        type: uploadFileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'spreadsheet',
        size: `${previewItems.length} items`,
        uploadDate: new Date().toLocaleDateString('en-GB'),
        dataUrl: pendingPdfDataUrl || undefined,
      };
      saveDocsList([newDoc, ...uploadedDocs]);

      setUploadModalOpen(false);
      setPreviewItems([]);
      setPendingPdfDataUrl('');
      fetchData(selectedYear);
      setToast({
        open: true,
        message: `Successfully imported ${previewItems.length} items! Automatically synced to Product & Categories pages.`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Import failed:', err);
      alert(err.message || 'Failed to import price list items.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDocUpload = () => {
    if (!pendingDocUpload) return;
    const finalDoc: UploadedPriceDoc = {
      ...pendingDocUpload,
      name: docTitle.trim() ? (docTitle.trim() + (pendingDocUpload.type === 'pdf' ? '.pdf' : '')) : pendingDocUpload.name,
    };

    saveDocsList([finalDoc, ...uploadedDocs]);
    setDocUploadModalOpen(false);
    setPendingDocUpload(null);
    setActiveViewMode('documents');
    setToast({
      open: true,
      message: `Rate Card "${finalDoc.name}" uploaded and saved to your catalog!`,
      severity: 'success',
    });
  };

  const handleQuickAddProductFromDoc = async () => {
    if (!quickItemName.trim()) {
      alert('Please enter product name');
      return;
    }
    const rNum = Number(quickRate);
    if (isNaN(rNum) || rNum < 0) {
      alert('Please enter a valid rate');
      return;
    }

    try {
      setQuickSaving(true);
      const nextSlNo = items.length > 0 ? Math.max(...items.map((i) => i.slNo || 0)) + 1 : 1;
      await PriceListsApi.create({
        slNo: nextSlNo,
        itemName: quickItemName.trim(),
        category: quickCategory || 'General',
        unit: quickUnit || 'Box',
        rate: rNum,
        mrp: rNum,
        year: selectedYear,
        batchName: docTitle || pendingDocUpload?.name || 'Photo Entry',
      });

      setQuickItemName('');
      setQuickRate('');
      fetchData(selectedYear);
      setToast({
        open: true,
        message: `Product "${quickItemName.trim()}" added to Price List!`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Quick add failed:', err);
      alert(err.message || 'Failed to add product');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    const target = uploadedDocs.find((d) => d.id === id);
    if (!target) return;
    if (!window.confirm(`Remove "${target.name}" and any uploaded items associated with it?`)) return;

    try {
      const batchTitle = target.name.replace(/\.[^/.]+$/, '');
      await PriceListsApi.deleteBatch(batchTitle).catch(() => {});
      await PriceListsApi.deleteBatch(target.name).catch(() => {});
      saveDocsList(uploadedDocs.filter((d) => d.id !== id));
      fetchData();
      setToast({
        open: true,
        message: `Document "${target.name}" and associated products removed!`,
        severity: 'info',
      });
    } catch {
      saveDocsList(uploadedDocs.filter((d) => d.id !== id));
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'SL.NO': 1,
        'Item Name': '2 3/4 Kuruvi Crackers',
        Category: 'One Sound Crackers',
        Unit: 'Box',
        MRP: 120,
        'Discount %': 15,
        Rate: 102,
      },
      {
        'SL.NO': 2,
        'Item Name': 'Ground Chakkar Special (10 Pcs)',
        Category: 'Ground Chakkars',
        Unit: 'Box',
        MRP: 250,
        'Discount %': 20,
        Rate: 200,
      },
      {
        'SL.NO': 3,
        'Item Name': 'Flower Pots Special (10 Pcs)',
        Category: 'Flower Pots / Sparklers',
        Unit: 'Box',
        MRP: 320,
        'Discount %': 20,
        Rate: 256,
      },
      {
        'SL.NO': 4,
        'Item Name': '12 Shot Rider Aerial Fireworks',
        Category: 'Fancy Aerial Shots',
        Unit: 'Box',
        MRP: 750,
        'Discount %': 10,
        Rate: 675,
      },
    ];

    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Manjula Crackers';
    const cleanPrefix = compName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PriceList_Template');
    XLSX.writeFile(workbook, `${cleanPrefix}_Price_List_Template.xlsx`);
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('No price list items to export.');
      return;
    }
    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Manjula Crackers';
    const cleanPrefix = compName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const exportData = filteredItems.map((item, idx) => ({
      'SL.NO': item.slNo || idx + 1,
      'Item Name': item.itemName,
      Category: item.category,
      Unit: item.unit,
      MRP: item.mrp,
      'Discount %': item.discountPercent || 0,
      'Net Rate': item.rate,
      'Last Updated': item.effectiveDate || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price_List');
    XLSX.writeFile(workbook, `${cleanPrefix}_Price_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPriceList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Manjula Crackers';
    const compUpper = compName.toUpperCase();
    const compTagline = storeSettings.tagline || `Official Wholesale & Retail Price List • ${storeSettings.city || 'Sivakasi'}`;

    const rowsHtml = filteredItems
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #B0C4DE; padding: 4px 6px;">${item.slNo || idx + 1}</td>
        <td style="border: 1px solid #B0C4DE; padding: 4px 8px; font-weight: 600;">${item.itemName}</td>
        <td style="border: 1px solid #B0C4DE; padding: 4px 6px; color: #475569;">${item.category || 'General'}</td>
        <td style="text-align: center; border: 1px solid #B0C4DE; padding: 4px 6px;">${item.unit || 'Box'}</td>
        <td style="text-align: right; border: 1px solid #B0C4DE; padding: 4px 6px; color: #64748B;">₹${Number(item.mrp || 0).toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #B0C4DE; padding: 4px 6px;">${item.discountPercent ? `${item.discountPercent}%` : '—'}</td>
        <td style="text-align: right; border: 1px solid #B0C4DE; padding: 4px 8px; font-weight: 700; color: #741748;">₹${Number(item.rate || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${compName} - Price List</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 15px; color: #0F172A; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #741748; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 20px; font-weight: bold; color: #741748; margin: 0; }
          .subtitle { font-size: 11px; color: #475569; font-weight: bold; text-transform: uppercase; margin-top: 3px; }
          .meta { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
          th { background-color: #DCE7F5; color: #0F172A; font-weight: bold; border: 1px solid #B0C4DE; padding: 6px 8px; text-align: left; }
          th.center, td.center { text-align: center; }
          th.right, td.right { text-align: right; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          @media print {
            body { margin: 8mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${compUpper}</div>
          <div class="subtitle">${compTagline}</div>
        </div>
        <div class="meta">
          <span><strong>Category:</strong> ${selectedCategory === 'ALL' ? 'All Products' : selectedCategory}</span>
          <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</span>
          <span><strong>Total Items:</strong> ${filteredItems.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="center" style="width: 45px;">SL.NO</th>
              <th>ITEM NAME</th>
              <th>CATEGORY</th>
              <th class="center" style="width: 60px;">UNIT</th>
              <th class="right" style="width: 80px;">M.R.P</th>
              <th class="center" style="width: 70px;">DISC %</th>
              <th class="right" style="width: 90px;">NET RATE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenAdd = () => {
    const currentSystemYear = new Date().getFullYear().toString();
    const selectedViewYear = getSelectedBillYear();
    if (selectedViewYear !== currentSystemYear) {
      triggerYearRestrictionDialog({ selectedYear: selectedViewYear, currentSystemYear });
      return;
    }

    setEditingItem(null);
    setFormSlNo(items.length > 0 ? Math.max(...items.map((i) => i.slNo || 0)) + 1 : 1);
    setFormName('');
    setFormCategory(categories[0]?.name || 'General');
    setFormUnit('Box');
    setFormMrp('0');
    setFormDiscount('0');
    setFormRate('0');
    setItemModalOpen(true);
  };

  const handleOpenEdit = (item: PriceItem) => {
    setEditingItem(item);
    setFormSlNo(item.slNo || 1);
    setFormName(item.itemName || '');
    setFormCategory(item.category || 'General');
    setFormUnit(item.unit || 'Box');
    setFormMrp(String(item.mrp || 0));
    setFormDiscount(String(item.discountPercent || 0));
    setFormRate(String(item.rate || 0));
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      alert('Please enter product/item name');
      return;
    }
    const rateNum = Number(formRate);
    if (isNaN(rateNum) || rateNum < 0) {
      alert('Please enter a valid rate/price');
      return;
    }

    if (!editingItem) {
      const currentSystemYear = new Date().getFullYear().toString();
      const selectedViewYear = getSelectedBillYear();
      if (selectedViewYear !== currentSystemYear) {
        triggerYearRestrictionDialog({ selectedYear: selectedViewYear, currentSystemYear });
        return;
      }
    }

    try {
      setSavingItem(true);
      const payload = {
        slNo: Number(formSlNo) || 1,
        itemName: formName.trim(),
        category: formCategory,
        unit: formUnit,
        mrp: Number(formMrp) || 0,
        discountPercent: Number(formDiscount) || 0,
        rate: rateNum,
        year: selectedYear,
      };

      if (editingItem) {
        const id = editingItem._id || editingItem.id || '';
        await PriceListsApi.update(id, payload);
      } else {
        await PriceListsApi.create(payload);
      }
      setItemModalOpen(false);
      fetchData(selectedYear);
      setToast({
        open: true,
        message: `Product "${payload.itemName}" saved successfully!`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Failed to save item:', err);
      alert(err.message || 'Error saving price item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: PriceItem) => {
    const id = item._id || item.id || '';
    if (!id) return;
    if (!window.confirm(`Delete "${item.itemName}" from Price List?`)) return;

    try {
      await PriceListsApi.delete(id);
      setItems((prev) => prev.filter((i) => (i._id || i.id) !== id));
      setToast({
        open: true,
        message: `Item "${item.itemName}" deleted from Price List.`,
        severity: 'info',
      });
    } catch (err: any) {
      console.error('Failed to delete price item:', err);
      alert(err.message || 'Error deleting price item');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL price list items?')) {
      return;
    }
    try {
      await PriceListsApi.clearAll();
      setItems([]);
      setToast({
        open: true,
        message: 'All price list items cleared successfully.',
        severity: 'info',
      });
    } catch (err: any) {
      console.error('Failed to clear price list:', err);
      alert(err.message || 'Error clearing price list');
    }
  };

  const handleMrpChange = (val: string) => {
    setFormMrp(val);
    const mrpNum = Number(val) || 0;
    const discNum = Number(formDiscount) || 0;
    if (mrpNum > 0 && discNum > 0) {
      setFormRate(String(Math.round(mrpNum - (mrpNum * discNum) / 100)));
    } else if (mrpNum > 0 && !Number(formRate)) {
      setFormRate(String(mrpNum));
    }
  };

  const handleDiscountChange = (val: string) => {
    setFormDiscount(val);
    const mrpNum = Number(formMrp) || 0;
    const discNum = Number(val) || 0;
    if (mrpNum > 0) {
      setFormRate(String(Math.round(mrpNum - (mrpNum * discNum) / 100)));
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 'calc(100vh - 48px)',
        bgcolor: '#D9E4F2',
        p: { xs: 1, sm: 1.5 },
        boxSizing: 'border-box',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv, .pdf, image/*, .png, .jpg, .jpeg, .webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Main ERP Window Card */}
      <Paper
        elevation={0}
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
        {/* Window Title Header Bar */}
        <Box
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            px: 1.5,
            py: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableChartRoundedIcon sx={{ fontSize: 18, color: '#1E3A8A' }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', letterSpacing: 0.2 }}>
              Price List Master & Catalog
            </Typography>
            <Chip
              label={`${filteredItems.length} / ${items.length} Items`}
              size="small"
              sx={{
                height: '20px',
                fontSize: '11px',
                fontWeight: 700,
                bgcolor: '#D2E3F5',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
              }}
            />
          </Box>

          {/* Right: Year Selector & Subtabs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Year Selector */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: '#FFFFFF',
                border: '1px solid #93C5FD',
                borderRadius: '4px',
                px: 1,
                py: 0.2,
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>
                Year:
              </Typography>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#1E3A8A',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} style={{ color: '#0F172A', fontWeight: 600 }}>
                    {y}
                  </option>
                ))}
              </select>
            </Box>

            <Button
              size="small"
              onClick={() => setActiveViewMode('table')}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                borderRadius: '3px',
                bgcolor: activeViewMode === 'table' ? '#D2E3F5' : '#EDF4FB',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
                '&:hover': { bgcolor: '#C5DCF5' },
              }}
            >
              Price List Table ({items.length})
            </Button>
            <Button
              size="small"
              onClick={() => setActiveViewMode('documents')}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                borderRadius: '3px',
                bgcolor: activeViewMode === 'documents' ? '#D2E3F5' : '#EDF4FB',
                color: '#1E3A8A',
                border: '1px solid #99BBE8',
                '&:hover': { bgcolor: '#C5DCF5' },
              }}
            >
              Uploaded Documents ({uploadedDocs.length})
            </Button>
            <Button
              size="small"
              onClick={() => setShowUploadZone((prev) => !prev)}
              startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.3,
                minHeight: '26px',
                borderRadius: '3px',
                bgcolor: showUploadZone ? '#741748' : '#EDF4FB',
                color: showUploadZone ? '#FFFFFF' : '#0F172A',
                border: '1px solid #94A3B8',
                '&:hover': { bgcolor: showUploadZone ? '#580e34' : '#E2E8F0' },
              }}
            >
              {showUploadZone ? 'Close Upload ✕' : 'Import / Upload ▾'}
            </Button>
          </Box>
        </Box>

        {/* Collapsible Multi-Format Upload Zone */}
        <Collapse in={showUploadZone}>
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: 1.5,
              m: 1,
              bgcolor: isDragging ? '#FEF2F2' : '#F8FAFC',
              border: isDragging ? '1.5px dashed #DC2626' : '1px dashed #9BB3CC',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '3px',
                  bgcolor: '#741748',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudUploadRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                  Bulk Import Price List
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                  Supports Excel (.xlsx, .xls), CSV (.csv), PDF documents, or scanned Rate Card photos (.png, .jpg).
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                onClick={handleDownloadTemplate}
                startIcon={<DownloadRoundedIcon sx={{ fontSize: 15 }} />}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #94A3B8',
                  borderRadius: '3px',
                  px: 1.2,
                  py: 0.3,
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                Template
              </Button>
              <Button
                size="small"
                onClick={() => setPasteModalOpen(true)}
                startIcon={<ContentPasteRoundedIcon sx={{ fontSize: 15 }} />}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #94A3B8',
                  borderRadius: '3px',
                  px: 1.2,
                  py: 0.3,
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                Paste Text / WhatsApp
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 15 }} />}
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  bgcolor: '#741748',
                  color: '#FFFFFF',
                  borderRadius: '3px',
                  px: 1.5,
                  py: 0.4,
                  '&:hover': { bgcolor: '#580e34' },
                }}
              >
                Choose File to Upload
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* Toolbar & Action Bar */}
        <Box
          sx={{
            p: 1,
            bgcolor: '#F8FAFC',
            borderBottom: '1px solid #DCE7F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* Search Box */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: '#FFFFFF',
              border: '1px solid #94A3B8',
              borderRadius: '2px',
              px: 1,
              py: 0.2,
              width: { xs: '100%', sm: '240px' },
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 17, color: '#64748B', mr: 0.5 }} />
            <InputBase
              placeholder="Search product / rate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                fontSize: '12px',
                width: '100%',
                '& input': { p: 0 },
              }}
            />
            {searchTerm && (
              <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.2 }}>
                <ClearRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={handlePrintPriceList}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: '#EDF4FB',
                color: '#0F172A',
                border: '1px solid #94A3B8',
                borderRadius: '3px',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.4,
                '&:hover': { bgcolor: '#E2E8F0' },
              }}
            >
              Print Sheet
            </Button>
            <Button
              size="small"
              onClick={handleExportExcel}
              startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: '#EDF4FB',
                color: '#0F172A',
                border: '1px solid #94A3B8',
                borderRadius: '3px',
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.2,
                py: 0.4,
                '&:hover': { bgcolor: '#E2E8F0' },
              }}
            >
              Export Excel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleOpenAdd}
              startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: '#741748',
                color: '#FFFFFF',
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.5,
                py: 0.4,
                '&:hover': { bgcolor: '#580e34' },
              }}
            >
              + Add Item
            </Button>
          </Box>
        </Box>

        {/* Category Pills Filter Bar */}
        {activeViewMode === 'table' && (
          <Box
            sx={{
              px: 1.2,
              py: 0.6,
              bgcolor: '#FFFFFF',
              borderBottom: '1px solid #DCE7F5',
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mr: 0.5, flexShrink: 0 }}>
              Category:
            </Typography>

            <Chip
              label={`All Items (${items.length})`}
              onClick={() => setSelectedCategory('ALL')}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '11px',
                height: '22px',
                cursor: 'pointer',
                bgcolor: selectedCategory === 'ALL' ? '#D2E3F5' : '#EDF4FB',
                color: '#1E3A8A',
                border: selectedCategory === 'ALL' ? '1px solid #1E3A8A' : '1px solid #99BBE8',
                '&:hover': { bgcolor: '#C5DCF5' },
              }}
            />

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const count = items.filter((i) => i.category === cat.name).length;
              return (
                <Chip
                  key={cat.name}
                  label={`${cat.name} (${count})`}
                  onClick={() => setSelectedCategory(cat.name)}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '11px',
                    height: '22px',
                    cursor: 'pointer',
                    bgcolor: isSelected ? '#D2E3F5' : '#EDF4FB',
                    color: '#1E3A8A',
                    border: isSelected ? '1px solid #1E3A8A' : '1px solid #99BBE8',
                    '&:hover': { bgcolor: '#C5DCF5' },
                  }}
                />
              );
            })}

            {items.length > 0 && (
              <Tooltip title="Clear entire price list" arrow>
                <IconButton
                  size="small"
                  onClick={handleClearAll}
                  sx={{
                    ml: 'auto',
                    color: '#DC2626',
                    bgcolor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '2px',
                    p: 0.3,
                    '&:hover': { bgcolor: '#FEE2E2' },
                  }}
                >
                  <DeleteSweepRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* VIEW 1: Main Price List Table */}
        {activeViewMode === 'table' && (
          <TableContainer
            sx={{
              maxHeight: 'calc(100vh - 210px)',
              overflowX: 'auto',
              overflowY: 'auto',
            }}
          >
            <Table size="small" stickyHeader aria-label="price list table">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      py: 0.6,
                      px: 1,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '45px',
                      textAlign: 'center',
                    }}
                  >
                    S.No
                  </TableCell>
                  <TableCell
                    sx={{
                      py: 0.6,
                      px: 1.5,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                    }}
                  >
                    Item / Product Name
                  </TableCell>
                  <TableCell
                    sx={{
                      py: 0.6,
                      px: 1.2,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '180px',
                    }}
                  >
                    Category
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.6,
                      px: 1,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '70px',
                    }}
                  >
                    Unit
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      py: 0.6,
                      px: 1.2,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '90px',
                    }}
                  >
                    MRP (₹)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.6,
                      px: 1,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '75px',
                    }}
                  >
                    Disc %
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      py: 0.6,
                      px: 1.5,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      borderRight: '1px solid #CBD5E1',
                      width: '110px',
                    }}
                  >
                    Rate (₹)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.6,
                      px: 0.8,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      bgcolor: '#DCE7F5',
                      borderBottom: '1px solid #B0C4DE',
                      width: '80px',
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} sx={{ color: '#741748' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748B' }}>
                      {searchTerm ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
                            No price list items matching "{searchTerm}" found.
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => setSearchTerm('')}
                            sx={{ textTransform: 'none', color: '#741748', fontWeight: 700, fontSize: '11.5px' }}
                          >
                            Clear Search
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <FilePresentRoundedIcon sx={{ fontSize: 36, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 700 }}>
                            No items in price list yet.
                          </Typography>
                          <Typography sx={{ fontSize: '11.5px', color: '#94A3B8' }}>
                            Click "+ Add Item" or "Import / Upload" above to populate your catalog.
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, index) => (
                    <TableRow
                      key={item._id || item.id || index}
                      sx={{
                        '&:hover': { bgcolor: '#F1F7FD' },
                        bgcolor: index % 2 === 1 ? '#FAFCFE' : '#FFFFFF',
                      }}
                    >
                      <TableCell align="center" sx={{ py: 0.5, px: 1, fontSize: '12px', borderRight: '1px solid #E2E8F0', color: '#64748B' }}>
                        {item.slNo || index + 1}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, px: 1.5, fontSize: '12.5px', fontWeight: 600, borderRight: '1px solid #E2E8F0', color: '#0F172A' }}>
                        {item.itemName}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, px: 1.2, fontSize: '11.5px', borderRight: '1px solid #E2E8F0' }}>
                        <Chip
                          label={item.category || 'General'}
                          size="small"
                          sx={{
                            fontSize: '11px',
                            fontWeight: 600,
                            bgcolor: '#EDF4FB',
                            color: '#1E3A8A',
                            border: '1px solid #CBD5E1',
                            borderRadius: '2px',
                            height: '20px',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1, fontSize: '12px', borderRight: '1px solid #E2E8F0', color: '#475569' }}>
                        {item.unit || 'Box'}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1.2, fontSize: '12px', borderRight: '1px solid #E2E8F0', color: '#64748B' }}>
                        {item.mrp ? `₹${Number(item.mrp).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 1, fontSize: '12px', fontWeight: 600, borderRight: '1px solid #E2E8F0', color: item.discountPercent ? '#059669' : '#94A3B8' }}>
                        {item.discountPercent ? `${item.discountPercent}%` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1.5, fontSize: '12.5px', fontWeight: 700, borderRight: '1px solid #E2E8F0', color: '#741748' }}>
                        ₹{Number(item.rate || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.4, px: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
                          <Tooltip title="Edit" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(item)}
                              sx={{
                                color: '#1E3A8A',
                                bgcolor: '#EDF4FB',
                                border: '1px solid #CBD5E1',
                                borderRadius: '2px',
                                p: 0.3,
                                '&:hover': { bgcolor: '#DBEAFE' },
                              }}
                            >
                              <ModeEditOutlineRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteItem(item)}
                              sx={{
                                color: '#DC2626',
                                bgcolor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '2px',
                                p: 0.3,
                                '&:hover': { bgcolor: '#FEE2E2' },
                              }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* VIEW 2: Uploaded Documents & Catalogs */}
        {activeViewMode === 'documents' && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Uploaded Price Documents & Rate Cards ({uploadedDocs.length})
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{
                  bgcolor: '#741748',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '3px',
                  '&:hover': { bgcolor: '#580e34' },
                }}
              >
                Upload New Document
              </Button>
            </Box>

            {uploadedDocs.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
                <PictureAsPdfRoundedIcon sx={{ fontSize: 40, color: '#94A3B8', mb: 1 }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>
                  No PDF or Image rate cards uploaded yet.
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: '#94A3B8', mt: 0.5 }}>
                  Click "Upload New Document" to store price sheet PDFs or scanned rate card photos.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {uploadedDocs.map((doc) => (
                  <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: '3px',
                        border: '1px solid #CBD5E1',
                        bgcolor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        '&:hover': { borderColor: '#1E3A8A' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '3px',
                            bgcolor: doc.type === 'pdf' ? '#FEF2F2' : doc.type === 'image' ? '#EFF6FF' : '#ECFDF5',
                            color: doc.type === 'pdf' ? '#DC2626' : doc.type === 'image' ? '#2563EB' : '#059669',
                            border: `1px solid ${doc.type === 'pdf' ? '#FECACA' : doc.type === 'image' ? '#BFDBFE' : '#A7F3D0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {doc.type === 'pdf' ? (
                            <PictureAsPdfRoundedIcon sx={{ fontSize: 18 }} />
                          ) : doc.type === 'image' ? (
                            <ImageRoundedIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <TableChartRoundedIcon sx={{ fontSize: 18 }} />
                          )}
                        </Box>
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography noWrap sx={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                            {doc.name}
                          </Typography>
                          <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                            {doc.type.toUpperCase()} • {doc.size} • {doc.uploadDate}
                          </Typography>
                        </Box>
                      </Box>

                      {doc.type === 'image' && doc.dataUrl && (
                        <Box
                          component="img"
                          src={doc.dataUrl}
                          alt={doc.name}
                          sx={{
                            width: '100%',
                            height: '110px',
                            objectFit: 'cover',
                            borderRadius: '2px',
                            border: '1px solid #E2E8F0',
                          }}
                        />
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 0.5 }}>
                        {doc.dataUrl ? (
                          <Button
                            size="small"
                            startIcon={<VisibilityRoundedIcon sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              setViewingDoc(doc);
                              setViewDocModalOpen(true);
                            }}
                            sx={{
                              bgcolor: '#EDF4FB',
                              border: '1px solid #94A3B8',
                              color: '#0F172A',
                              fontWeight: 700,
                              fontSize: '11px',
                              textTransform: 'none',
                              borderRadius: '2px',
                              py: 0.2,
                              px: 1,
                              '&:hover': { bgcolor: '#E2E8F0' },
                            }}
                          >
                            View
                          </Button>
                        ) : (
                          <Chip label="Imported Sheet" size="small" sx={{ fontSize: '10px', height: '18px', fontWeight: 600 }} />
                        )}

                        <IconButton
                          size="small"
                          onClick={() => handleDeleteDoc(doc.id)}
                          sx={{ color: '#DC2626', p: 0.4, '&:hover': { bgcolor: '#FEF2F2' } }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Live OCR / Scanning Progress Dialog */}
      <Dialog
        open={ocrLoading}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              p: 2.5,
              width: '380px',
              maxWidth: '90vw',
              textAlign: 'center',
              border: '1px solid #9BB3CC',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <AutoFixHighRoundedIcon sx={{ fontSize: 28, color: '#741748' }} />
          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
            AI OCR Scanning Document...
          </Typography>
          <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
            {ocrStatusText || 'Extracting products, categories, and rates...'}
          </Typography>
          <Box sx={{ width: '100%', mt: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={ocrProgress || 30}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { bgcolor: '#741748' },
              }}
            />
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', mt: 0.5, textAlign: 'right' }}>
              {ocrProgress}%
            </Typography>
          </Box>
        </Box>
      </Dialog>

      {/* Paste Text / WhatsApp Price List Modal */}
      <Dialog
        open={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '1px solid #9BB3CC',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0F172A',
            py: 1,
            px: 2,
          }}
        >
          Paste Price List Text (WhatsApp / Notes / SMS)
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography sx={{ fontSize: '11.5px', color: '#64748B', mb: 1 }}>
            Paste price list text below. Product names, rates, and categories will be automatically extracted:
          </Typography>
          <TextField
            multiline
            rows={9}
            fullWidth
            placeholder={`ONE SOUND CRACKERS\n1. 2 3/4" Kuruvi Crackers - 1 Box - Rs. 45\n2. 3 1/2" Lakshmi Crackers - 1 Pkt - Rs. 65\n\nSPARKLERS\n3. 10 cm Electric Sparklers - 1 Box - Rs. 35`}
            value={pasteTextContent}
            onChange={(e) => setPasteTextContent(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  bgcolor: '#FFFFFF',
                  borderRadius: '2px',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #DCE7F5' }}>
          <Button
            size="small"
            onClick={() => setPasteModalOpen(false)}
            sx={{ color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleExtractFromPasteText}
            startIcon={<AutoFixHighRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            Extract & Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Preview Dialog */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => !uploading && setUploadModalOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '1px solid #9BB3CC',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0F172A',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Preview Detected Price Items ({previewItems.length} Products Found)</span>
          <Chip
            label={`Source: ${uploadFileName}`}
            size="small"
            sx={{ bgcolor: '#D2E3F5', color: '#1E3A8A', fontSize: '11px', fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5, alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Batch / Catalog Label"
                value={uploadBatchName}
                onChange={(e) => setUploadBatchName(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12px' } }, inputLabel: { sx: { fontSize: '12px' } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    size="small"
                    sx={{ color: '#741748', '&.Mui-checked': { color: '#741748' } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
                    Replace existing catalog (Leave unchecked to append/merge)
                  </Typography>
                }
              />
            </Grid>
          </Grid>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid #CBD5E1', maxHeight: '340px', overflowY: 'auto', borderRadius: '2px' }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '45px', bgcolor: '#DCE7F5' }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', minWidth: '200px', bgcolor: '#DCE7F5' }}>Item Name *</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '160px', bgcolor: '#DCE7F5' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '80px', bgcolor: '#DCE7F5' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '90px', bgcolor: '#DCE7F5' }}>MRP (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px', width: '100px', color: '#741748', bgcolor: '#DCE7F5' }}>Rate (₹) *</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '11px', width: '45px', bgcolor: '#DCE7F5' }}>Del</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewItems.map((p, i) => (
                  <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F1F7FD' } }}>
                    <TableCell sx={{ fontSize: '11.5px', color: '#64748B', textAlign: 'center' }}>
                      {p.slNo || i + 1}
                    </TableCell>
                    <TableCell sx={{ py: 0.3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={p.itemName || ''}
                        onChange={(e) => handleUpdatePreviewItem(i, 'itemName', e.target.value)}
                        slotProps={{ input: { sx: { fontSize: '12px', py: 0.2 } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.3 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={p.category || 'General'}
                          onChange={(e) => handleUpdatePreviewItem(i, 'category', e.target.value)}
                          sx={{ fontSize: '12px' }}
                        >
                          {categories.map((c) => (
                            <MenuItem key={c.name} value={c.name} sx={{ fontSize: '12px' }}>
                              {c.name}
                            </MenuItem>
                          ))}
                          {categories.every((c) => c.name !== p.category) && (
                            <MenuItem value={p.category || 'General'} sx={{ fontSize: '12px' }}>{p.category || 'General'}</MenuItem>
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ py: 0.3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={p.unit || 'Box'}
                        onChange={(e) => handleUpdatePreviewItem(i, 'unit', e.target.value)}
                        slotProps={{ input: { sx: { fontSize: '12px', py: 0.2 } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={p.mrp || 0}
                        onChange={(e) => handleUpdatePreviewItem(i, 'mrp', Number(e.target.value))}
                        slotProps={{ input: { sx: { fontSize: '12px', py: 0.2 } } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={p.rate || 0}
                        onChange={(e) => handleUpdatePreviewItem(i, 'rate', Number(e.target.value))}
                        slotProps={{
                          input: {
                            sx: { fontSize: '12px', fontWeight: 700, color: '#741748', py: 0.2 },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.3 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePreviewItem(i)}
                        sx={{ color: '#DC2626', p: 0.3 }}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              size="small"
              onClick={handleAddPreviewRow}
              startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{
                color: '#1E3A8A',
                fontWeight: 700,
                fontSize: '11.5px',
                textTransform: 'none',
              }}
            >
              + Add Another Row
            </Button>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#741748' }}>
              Total: {previewItems.length} Products
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #DCE7F5' }}>
          <Button
            size="small"
            onClick={() => setUploadModalOpen(false)}
            disabled={uploading}
            sx={{ color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmSpreadsheetUpload}
            disabled={uploading || previewItems.length === 0}
            startIcon={
              uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadRoundedIcon sx={{ fontSize: 16 }} />
            }
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2.5,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {uploading ? 'Syncing...' : `Confirm & Save ${previewItems.length} Products`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF / Image Document Upload Dialog */}
      {docUploadModalOpen && pendingDocUpload && (
        <Dialog
          open={docUploadModalOpen}
          onClose={() => setDocUploadModalOpen(false)}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '4px',
                border: '1px solid #9BB3CC',
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
              borderBottom: '1px solid #A8C2DC',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0F172A',
              py: 1,
              px: 2,
            }}
          >
            Upload Rate Card Document ({pendingDocUpload.type.toUpperCase()})
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Box sx={{ mb: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Rate Card / Document Name"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12.5px' } }, inputLabel: { sx: { fontSize: '12.5px' } } }}
              />
            </Box>

            <Box
              sx={{
                width: '100%',
                maxHeight: '220px',
                minHeight: '140px',
                bgcolor: '#F8FAFC',
                borderRadius: '2px',
                border: '1px solid #CBD5E1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                mb: 1.5,
              }}
            >
              {pendingDocUpload.type === 'image' && pendingDocUpload.dataUrl ? (
                <Box
                  component="img"
                  src={pendingDocUpload.dataUrl}
                  alt={pendingDocUpload.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    objectFit: 'contain',
                  }}
                />
              ) : pendingDocUpload.type === 'pdf' && pendingDocUpload.dataUrl ? (
                <iframe
                  src={pendingDocUpload.dataUrl}
                  title="PDF Preview"
                  width="100%"
                  height="220px"
                  style={{ border: 'none' }}
                />
              ) : (
                <Typography sx={{ color: '#64748B', fontSize: '12px' }}>File ready to upload</Typography>
              )}
            </Box>

            {/* Optional Quick Add */}
            <Box sx={{ p: 1, bgcolor: '#F1F7FD', border: '1px dashed #9BB3CC', borderRadius: '2px' }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#1E3A8A', mb: 0.8 }}>
                Quick Add item from this photo/document:
              </Typography>
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Item Name"
                    value={quickItemName}
                    onChange={(e) => setQuickItemName(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '12px', py: 0.2 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      sx={{ fontSize: '12px' }}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.name} value={c.name} sx={{ fontSize: '12px' }}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 3, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rate (₹)"
                    type="number"
                    value={quickRate}
                    onChange={(e) => setQuickRate(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '12px', fontWeight: 700, color: '#741748', py: 0.2 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 3, sm: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Unit"
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '12px', py: 0.2 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1.5 }}>
                  <Button
                    fullWidth
                    size="small"
                    onClick={handleQuickAddProductFromDoc}
                    disabled={quickSaving || !quickItemName.trim() || !quickRate}
                    sx={{
                      bgcolor: '#EDF4FB',
                      border: '1px solid #94A3B8',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'none',
                      height: '32px',
                      borderRadius: '2px',
                      '&:hover': { bgcolor: '#E2E8F0' },
                    }}
                  >
                    + Add
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #DCE7F5' }}>
            <Button
              size="small"
              onClick={() => setDocUploadModalOpen(false)}
              sx={{ color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleConfirmDocUpload}
              startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: '#741748',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'none',
                px: 2,
                borderRadius: '3px',
                '&:hover': { bgcolor: '#580e34' },
              }}
            >
              Confirm Upload
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Full-Screen PDF & Image Document Viewer Dialog */}
      {viewDocModalOpen && viewingDoc && (
        <Dialog
          open={viewDocModalOpen}
          onClose={() => setViewDocModalOpen(false)}
          maxWidth="lg"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #9BB3CC',
                height: '85vh',
                display: 'flex',
                flexDirection: 'column',
              },
            },
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
              borderBottom: '1px solid #A8C2DC',
              px: 2,
              py: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewingDoc.type === 'pdf' ? (
                <PictureAsPdfRoundedIcon sx={{ color: '#DC2626', fontSize: 18 }} />
              ) : (
                <ImageRoundedIcon sx={{ color: '#2563EB', fontSize: 18 }} />
              )}
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {viewingDoc.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              {viewingDoc.dataUrl && (
                <Button
                  size="small"
                  onClick={() => {
                    const win = window.open(viewingDoc.dataUrl, '_blank');
                    win?.focus();
                  }}
                  startIcon={<PrintOutlinedIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #94A3B8',
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'none',
                    borderRadius: '2px',
                    py: 0.2,
                    px: 1,
                  }}
                >
                  Open in New Tab
                </Button>
              )}
              <IconButton size="small" onClick={() => setViewDocModalOpen(false)}>
                <ClearRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 0, flex: 1, bgcolor: '#0F172A', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
            {viewingDoc.type === 'pdf' && viewingDoc.dataUrl ? (
              <iframe
                src={viewingDoc.dataUrl}
                title={viewingDoc.name}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            ) : viewingDoc.type === 'image' && viewingDoc.dataUrl ? (
              <Box
                component="img"
                src={viewingDoc.dataUrl}
                alt={viewingDoc.name}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  p: 1,
                }}
              />
            ) : (
              <Typography sx={{ color: '#FFFFFF', fontSize: '12px' }}>Unable to preview document.</Typography>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Add / Edit Item Dialog */}
      <Dialog
        open={itemModalOpen}
        onClose={() => !savingItem && setItemModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '4px',
              border: '1px solid #9BB3CC',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(180deg, #E6F0FA 0%, #D2E4F6 100%)',
            borderBottom: '1px solid #A8C2DC',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0F172A',
            py: 1,
            px: 2,
          }}
        >
          {editingItem ? 'Edit Price Item' : 'Add Price List Item'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
                Sl No
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formSlNo}
                onChange={(e) => setFormSlNo(Number(e.target.value))}
                slotProps={{ input: { sx: { fontSize: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
                Category
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  sx={{ fontSize: '12px' }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.name} value={c.name} sx={{ fontSize: '12px' }}>
                      {c.name}
                    </MenuItem>
                  ))}
                  {categories.every((c) => c.name !== formCategory) && (
                    <MenuItem value={formCategory} sx={{ fontSize: '12px' }}>{formCategory}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box>
            <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
              Item / Product Name *
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="e.g. 2 3/4 Kuruvi, Ground Chakkar Deluxe..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
            />
          </Box>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
                Unit
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Box, Pcs, Pkt"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
                MRP (₹)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formMrp}
                onChange={(e) => handleMrpChange(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', mb: 0.4 }}>
                Discount (%)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formDiscount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12px' } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#741748', mb: 0.4 }}>
                Net Rate (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '12.5px', fontWeight: 700, color: '#741748' } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #DCE7F5' }}>
          <Button
            size="small"
            onClick={() => setItemModalOpen(false)}
            sx={{ color: '#475569', fontWeight: 600, fontSize: '12px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSaveItem}
            disabled={savingItem}
            sx={{
              bgcolor: '#741748',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'none',
              px: 2.5,
              borderRadius: '3px',
              '&:hover': { bgcolor: '#580e34' },
            }}
          >
            {savingItem ? 'Saving...' : editingItem ? 'Update Price' : 'Add to Price List'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%', fontWeight: 600, fontSize: '12px', borderRadius: '3px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
