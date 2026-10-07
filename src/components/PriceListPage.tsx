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
  Divider,
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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentPasteRoundedIcon from '@mui/icons-material/ContentPasteRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { PriceListsApi, CategoriesApi, ProductsApi } from '../services/api';
import { getStoredSettings } from './SettingsPage';

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

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [priceData, catData, prodsData] = await Promise.all([
        PriceListsApi.getAll(),
        CategoriesApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
      ]);

      const prodMap = new Map<string, any>();
      if (Array.isArray(prodsData)) {
        prodsData.forEach((p: any) => {
          if (p.name) {
            prodMap.set(p.name.toLowerCase().trim(), p);
          }
        });
      }

      let mergedItems: PriceItem[] = [];
      if (Array.isArray(priceData)) {
        mergedItems = priceData.map((item: any) => ({
          ...item,
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

  useEffect(() => {
    fetchData();
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

  // Converts / cleans text to 100% pure English (strips Tamil characters and translates common terms)
  const ensureEnglishText = (text: string): string => {
    if (!text) return '';
    let str = String(text).trim();

    // 1. If string contains English letters (e.g., "2 3/4" Kuruvi Crackers / 2 3/4" குருவி"), strip out the Tamil characters
    if (/[a-zA-Z]/.test(str)) {
      str = str.replace(/[\u0B80-\u0BFF]+/g, ' ');
    } else if (/[\u0B80-\u0BFF]/.test(str)) {
      // 2. Pure Tamil text with no English letters: replace known words
      for (const [tam, eng] of Object.entries(TAMIL_CRACKER_WORDS)) {
        str = str.replace(new RegExp(tam, 'g'), eng);
      }
      // If any unmapped Tamil characters still remain, clean them up
      str = str.replace(/[\u0B80-\u0BFF]+/g, ' ');
    }

    // 3. Clean up dangling parentheses, slashes, dashes, extra spaces
    str = str
      .replace(/\(\s*\)/g, ' ')
      .replace(/\[\s*\]/g, ' ')
      .replace(/\{\s*\}/g, ' ')
      .replace(/[\/\\|:_\-~*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return str;
  };

  // Universal Text-to-Items Parser (Supports OCR text, PDF text, and pasted WhatsApp price lists)
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
      // Clean up common OCR artifacts
      const line = rawLine.replace(/[|│]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!line || line.length < 2) continue;

      const lower = line.toLowerCase();
      // Skip header noise
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
        lower.includes('varun') ||
        lower.includes('dheeksha')
      ) {
        for (const cat of knownCats) {
          if (line.toUpperCase().includes(cat)) {
            currentCategory = ensureEnglishText(line.replace(/[:\-_~*|]/g, '').trim()) || 'One Sound Crackers';
            break;
          }
        }
        continue;
      }

      // Check if line is purely a category title
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

  // OCR Recognition using Tesseract
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

  // Helper to intelligently process PDF (Fast Text Layer + Automatic AI OCR Fallback)
  const processPdfDocument = async (
    arrayBuffer: ArrayBuffer,
    onProgress?: (p: number, status: string) => void
  ): Promise<Partial<PriceItem>[]> => {
    try {
      // Pass safe copy of bytes to prevent detached ArrayBuffer errors
      const uint8Copy = new Uint8Array(arrayBuffer.slice(0));
      const loadingTask = pdfjsLib.getDocument({ data: uint8Copy });
      const pdfDoc = await loadingTask.promise;
      let allLines = '';
      let hasText = false;

      // 1. Try digital text extraction first across all pages
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

      // 2. If no digital text was found (scanned image PDF), perform canvas OCR rendering page by page on the SAME pdfDoc
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

  // Intelligent Spreadsheet Parser (Extracts Columnar Tables AND Hierarchical Section Heading Rate Cards)
  const parseSpreadsheetWorkbook = (workbook: XLSX.WorkBook): Partial<PriceItem>[] => {
    const allParsedItems: Partial<PriceItem>[] = [];
    let globalSlNo = 1;

    // Helper to check title / contact noise lines
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
        l.includes('varun') ||
        l.includes('dheeksha')
      );
    };

    // Helper to identify if a row is a Category Section Heading (e.g. "ONE SOUND CRACKERS", "FLOWER POTS", "=== CHAKKARS ===")
    const detectCategoryHeading = (row: any[]): string | null => {
      const nonEmptyCells = row
        .map((c, i) => ({ val: String(c).trim(), idx: i }))
        .filter((item) => item.val.length > 0);

      if (nonEmptyCells.length === 0) return null;

      const rowText = nonEmptyCells.map((c) => c.val.toLowerCase()).join(' ');

      // If it looks like table header definitions, it's not a category
      if (
        (rowText.includes('item name') || rowText.includes('product') || rowText.includes('particular')) &&
        (rowText.includes('rate') || rowText.includes('mrp') || rowText.includes('price') || rowText.includes('amount'))
      ) {
        return null;
      }

      // Count positive numeric cells in this row (prices)
      const numericCells = nonEmptyCells.filter((c) => {
        const clean = c.val.replace(/[₹,Rs\.\/\s]/gi, '');
        const num = parseFloat(clean);
        return !isNaN(num) && num > 0 && /^\d+(\.\d+)?$/.test(clean);
      });

      // A category header has no price cells (or at most a section number like "1. ONE SOUND CRACKERS")
      if (numericCells.length === 0 || (numericCells.length === 1 && nonEmptyCells.length <= 2)) {
        let textCandidate = nonEmptyCells
          .map((c) => c.val)
          .join(' ')
          .replace(/^[\d\.\-\)\:]+/, '') // strip leading "1. " or "I. "
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
          // Re-map column indices for this section/table, prioritizing English name column
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

        // Check if this row is a Category Section Heading (e.g. "ONE SOUND CRACKERS")
        const detectedHeading = detectCategoryHeading(row);
        if (detectedHeading) {
          currentCategory = detectedHeading;
          continue;
        }

        // Extract product data
        let itemName = '';
        let itemCat = currentCategory;
        let itemUnit = 'Box';
        let itemMrp = 0;
        let itemRate = 0;
        let itemDisc = 0;
        let itemSlNo = globalSlNo;

        // Choose best column: prefer explicit English column, or column with English characters
        const activeNameCol = engNameCol !== -1 ? engNameCol : nameCol;

        if (activeNameCol !== -1 && row[activeNameCol] !== undefined && String(row[activeNameCol]).trim() !== '') {
          itemName = ensureEnglishText(String(row[activeNameCol]));

          // If activeNameCol had Tamil or was empty after cleaning, check if another column has English letters
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
          // Freeform cells analysis: inspect text cells and prefer English characters
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
            // Find English text among tokens
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

        // Calculate rate if MRP & discount provided
        if (!itemRate && itemMrp > 0) {
          itemRate = itemDisc > 0 ? itemMrp - (itemMrp * itemDisc) / 100 : itemMrp;
        }

        // Validate product
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

  // Unified File Processor (Supports Excel, CSV, PDF, and Images with OCR)
  const processUploadedFile = async (file: File) => {
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    // 1. Spreadsheet (.xlsx, .xls, .csv)
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
            message: `📊 Excel analyzed: Found ${parsed.length} products across ${uniqueCategories.length} categories (${uniqueCategories.slice(0, 3).join(', ')}${uniqueCategories.length > 3 ? '...' : ''})!`,
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

    // 2. PDF Document (.pdf) - Uses unified text extraction + OCR fallback on safe buffer copy
    if (fileExt === 'pdf' || file.type === 'application/pdf') {
      try {
        setOcrLoading(true);
        setOcrProgress(15);
        setOcrStatusText('Analyzing and reading PDF rate card...');

        const arrayBuffer = await file.arrayBuffer();

        // Also create dataUrl for visual document viewing in gallery
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (ev) => resolve(ev.target?.result as string);
          r.readAsDataURL(file);
        });
        setPendingPdfDataUrl(dataUrl);

        // Process PDF with fast text + OCR
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
            message: `✅ Successfully extracted ${extracted.length} products from PDF "${file.name}"! Review and confirm below to sync to Products & Categories.`,
            severity: 'success',
          });
        } else {
          // If no items found, fallback to doc upload modal
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

    // 3. Image Rate Card (.png, .jpg, .jpeg, .webp) - Uses OCR
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

        // Run OCR on image
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
            message: `✨ AI OCR detected ${extracted.length} cracker items from photo "${file.name}"! Review and sync to Products & Categories.`,
            severity: 'success',
          });
        } else {
          // If OCR didn't catch rows, open manual entry with image preview
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

  // Extract from pasted text (e.g. copied from WhatsApp / Excel / Notes)
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
      message: `✅ Extracted ${extracted.length} products from pasted text! Review and sync to Products & Categories.`,
      severity: 'success',
    });
  };

  // Editable Preview Table item modifier handlers
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
        stock: 100,
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

  // Commit spreadsheet or PDF upload to Backend API (Auto-syncs Products and Categories)
  const handleConfirmSpreadsheetUpload = async () => {
    if (previewItems.length === 0) return;

    try {
      setUploading(true);
      await PriceListsApi.bulkImport({
        items: previewItems,
        batchName: uploadBatchName || uploadFileName,
        replaceExisting,
      });

      // Also record as a document entry
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
      fetchData();
      setToast({
        open: true,
        message: `🎉 Successfully imported ${previewItems.length} items! Automatically synced to Product & Categories pages.`,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Import failed:', err);
      alert(err.message || 'Failed to import price list items.');
    } finally {
      setUploading(false);
    }
  };

  // Confirm PDF / Image Upload & Save to Catalog
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
      message: `✅ Rate Card "${finalDoc.name}" uploaded and saved to your catalog!`,
      severity: 'success',
    });
  };

  // Quick Add Product Item from Image to Price List Database
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
        batchName: docTitle || pendingDocUpload?.name || 'Photo Entry',
      });

      setQuickItemName('');
      setQuickRate('');
      fetchData();
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

  // Delete uploaded document & associated items
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

  // Download Sample Template
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
        Stock: 500,
      },
      {
        'SL.NO': 2,
        'Item Name': 'Ground Chakkar Special (10 Pcs)',
        Category: 'Ground Chakkars',
        Unit: 'Box',
        MRP: 250,
        'Discount %': 20,
        Rate: 200,
        Stock: 350,
      },
      {
        'SL.NO': 3,
        'Item Name': 'Flower Pots Special (10 Pcs)',
        Category: 'Flower Pots / Sparklers',
        Unit: 'Box',
        MRP: 320,
        'Discount %': 20,
        Rate: 256,
        Stock: 280,
      },
      {
        'SL.NO': 4,
        'Item Name': '12 Shot Rider Aerial Fireworks',
        Category: 'Fancy Aerial Shots',
        Unit: 'Box',
        MRP: 750,
        'Discount %': 10,
        Rate: 675,
        Stock: 120,
      },
    ];

    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Apsara Crackers';
    const cleanPrefix = compName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PriceList_Template');
    XLSX.writeFile(workbook, `${cleanPrefix}_Price_List_Template.xlsx`);
  };

  // Export current list to Excel
  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('No price list items to export.');
      return;
    }
    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Apsara Crackers';
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

  // Print Price List Direct
  const handlePrintPriceList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const storeSettings = getStoredSettings();
    const compName = storeSettings.companyName || 'Apsara Crackers';
    const compUpper = compName.toUpperCase();
    const compTagline = storeSettings.tagline || `Official Wholesale & Retail Price List • ${storeSettings.city || 'Sivakasi'}`;

    const rowsHtml = filteredItems
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #ddd; padding: 6px 8px;">${item.slNo || idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 6px 10px; font-weight: 600;">${item.itemName}</td>
        <td style="border: 1px solid #ddd; padding: 6px 8px; color: #666;">${item.category || 'General'}</td>
        <td style="text-align: center; border: 1px solid #ddd; padding: 6px 8px;">${item.unit || 'Box'}</td>
        <td style="text-align: right; border: 1px solid #ddd; padding: 6px 8px; color: #888;">₹${Number(item.mrp || 0).toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #ddd; padding: 6px 8px;">${item.discountPercent ? `${item.discountPercent}%` : '—'}</td>
        <td style="text-align: right; border: 1px solid #ddd; padding: 6px 10px; font-weight: 700; color: #b91c1c;">₹${Number(item.rate || 0).toFixed(2)}</td>
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
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #1f2937; }
          .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 24px; font-weight: bold; color: #b91c1c; margin: 0; }
          .subtitle { font-size: 13px; color: #d97706; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
          .meta { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background-color: #F1F5F9; color: #475569; font-weight: bold; border: 1px solid #E2E8F0; padding: 8px; text-align: left; }
          th.center, td.center { text-align: center; }
          th.right, td.right { text-align: right; }
          tr:nth-child(even) { background-color: #fafaf9; }
          @media print {
            body { margin: 10mm; }
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
              <th class="center" style="width: 50px;">SL.NO</th>
              <th>ITEM NAME</th>
              <th>CATEGORY</th>
              <th class="center" style="width: 70px;">UNIT</th>
              <th class="right" style="width: 90px;">M.R.P</th>
              <th class="center" style="width: 80px;">DISC %</th>
              <th class="right" style="width: 100px;">NET RATE</th>
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

  // Open Add Modal
  const handleOpenAdd = () => {
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

  // Open Edit Modal
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

  // Save manual item
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
      };

      if (editingItem) {
        const id = editingItem._id || editingItem.id || '';
        await PriceListsApi.update(id, payload);
      } else {
        await PriceListsApi.create(payload);
      }
      setItemModalOpen(false);
      fetchData();
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

  // Delete item (also auto-removes matching product from Products catalog)
  const handleDeleteItem = async (item: PriceItem) => {
    const id = item._id || item.id || '';
    if (!id) return;
    if (!window.confirm(`Delete "${item.itemName}" from Price List & Products catalog?`)) return;

    try {
      await PriceListsApi.delete(id);
      setItems((prev) => prev.filter((i) => (i._id || i.id) !== id));
      setToast({
        open: true,
        message: `✅ Item "${item.itemName}" deleted from Price List and Products catalog.`,
        severity: 'info',
      });
    } catch (err: any) {
      console.error('Failed to delete price item:', err);
      alert(err.message || 'Error deleting price item');
    }
  };

  // Clear all items (also clears all products)
  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL price list items? This will also remove them from the Products catalog.')) {
      return;
    }
    try {
      await PriceListsApi.clearAll();
      setItems([]);
      setToast({
        open: true,
        message: 'All price list items and products catalog cleared successfully.',
        severity: 'info',
      });
    } catch (err: any) {
      console.error('Failed to clear price list:', err);
      alert(err.message || 'Error clearing price list');
    }
  };

  // Auto calculate Net Rate from MRP & Discount % in modal
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
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        boxSizing: 'border-box',
      }}
    >
      {/* Collapsible Multi-Format Upload Zone Card (Excel, CSV, PDF, Images) */}
      <Collapse in={showUploadZone} sx={{ mb: showUploadZone ? 2.5 : 0 }}>
        <Paper
          elevation={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: '14px',
            border: isDragging ? '2px dashed #DC2626' : '1.5px dashed #F59E0B',
            backgroundColor: isDragging ? '#FEF2F2' : '#FFFDF5',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, .pdf, image/*, .png, .jpg, .jpeg, .webp"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />

          <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '12px',
                    backgroundColor: '#DC2626',
                    color: '#FEF08A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  <CloudUploadRoundedIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#991B1B' }}>
                      Upload Price List
                    </Typography>
                    <Chip
                      label="Excel • CSV • PDF • Images"
                      size="small"
                      sx={{ backgroundColor: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: '11px' }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '13px', color: '#786C58', fontWeight: 500, mt: 0.4 }}>
                    Upload Excel (<strong>.xlsx</strong>, <strong>.xls</strong>), <strong>.csv</strong>, <strong>PDF document</strong>, or <strong>Rate Card Image</strong> (.png, .jpg).
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  gap: 1.5,
                  flexWrap: 'wrap',
                }}
              >
                {/* Download Sample Template */}
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  startIcon={<DownloadRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    borderColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': {
                      borderColor: '#F59E0B',
                      backgroundColor: '#F8FAFC',
                    },
                  }}
                >
                  Excel Template
                </Button>

                {/* Paste Text / WhatsApp Rate List Button */}
                <Button
                  variant="outlined"
                  onClick={() => setPasteModalOpen(true)}
                  startIcon={<ContentPasteRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    borderColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': {
                      borderColor: '#F59E0B',
                      backgroundColor: '#F8FAFC',
                    },
                  }}
                >
                  Paste Text / WhatsApp List
                </Button>

                {/* Upload File Button */}
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                    },
                  }}
                >
                  Upload File / PDF / Image
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* View Mode & Upload Toggle Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={activeViewMode === 'table' ? 'contained' : 'outlined'}
            disableElevation
            onClick={() => setActiveViewMode('table')}
            startIcon={<TableChartRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              backgroundColor: activeViewMode === 'table' ? '#B91C1C' : '#FFFFFF',
              color: activeViewMode === 'table' ? '#FFFFFF' : '#475569',
              borderColor: '#E2E8F0',
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { backgroundColor: activeViewMode === 'table' ? '#991B1B' : '#F8FAFC' },
            }}
          >
            Price List Table ({items.length})
          </Button>

          <Button
            variant={activeViewMode === 'documents' ? 'contained' : 'outlined'}
            disableElevation
            onClick={() => setActiveViewMode('documents')}
            startIcon={<PictureAsPdfRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              backgroundColor: activeViewMode === 'documents' ? '#B91C1C' : '#FFFFFF',
              color: activeViewMode === 'documents' ? '#FFFFFF' : '#475569',
              borderColor: '#E2E8F0',
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { backgroundColor: activeViewMode === 'documents' ? '#991B1B' : '#F8FAFC' },
            }}
          >
            Uploaded PDFs & Images ({uploadedDocs.length})
          </Button>
        </Box>

        {/* Toggle Collapsible Upload Section */}
        <Button
          variant={showUploadZone ? 'contained' : 'outlined'}
          disableElevation
          onClick={() => setShowUploadZone((prev) => !prev)}
          startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            backgroundColor: showUploadZone ? '#DC2626' : '#FFFFFF',
            color: showUploadZone ? '#FFFFFF' : '#334155',
            borderColor: '#E2E8F0',
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'none',
            borderRadius: '8px',
            boxShadow: showUploadZone ? '0 2px 6px rgba(220,38,38,0.25)' : 'none',
            '&:hover': {
              backgroundColor: showUploadZone ? '#B91C1C' : '#F8FAFC',
              borderColor: '#F59E0B',
            },
          }}
        >
          {showUploadZone ? 'Close Upload Panel ✕' : 'Upload / Import Price List ▾'}
        </Button>
      </Box>

      {/* VIEW 1: Main Price List Table */}
      {activeViewMode === 'table' && (
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Sticky Header Wrapper: Fixed Explorer Header + Category Bar */}
          <Box
            sx={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '13px',
              borderTopRightRadius: '13px',
            }}
          >
            {/* Festive Red Top Banner */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                borderBottom: '2px solid #F59E0B',
                borderTopLeftRadius: '13px',
                borderTopRightRadius: '13px',
                px: { xs: 2, sm: 3 },
                py: 1.5,
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                alignItems: { xs: 'stretch', lg: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                minHeight: '60px',
              }}
            >
              {/* Title & Count Badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography
                  sx={{
                    color: '#FFFFFF',
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Price List Explorer
                </Typography>
                <Typography
                  sx={{
                    color: '#FEF08A',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(254, 240, 138, 0.2)',
                    border: '1px solid rgba(254, 240, 138, 0.35)',
                    px: 1.2,
                    py: 0.3,
                    borderRadius: '12px',
                  }}
                >
                  {filteredItems.length} of {items.length} items
                </Typography>
              </Box>

              {/* Search, Action Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                }}
              >
                {/* Search Input */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    px: 1.2,
                    height: '38px',
                    width: { xs: '100%', sm: '220px' },
                    boxSizing: 'border-box',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <SearchRoundedIcon sx={{ color: '#D97706', fontSize: 19, mr: 0.8, flexShrink: 0 }} />
                  <InputBase
                    placeholder="Search item / rate..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1F1714',
                      width: '100%',
                      '& input': {
                        p: 0,
                        '&::placeholder': { color: '#A8998A', opacity: 1 },
                      },
                    }}
                  />
                  {searchTerm && (
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{ p: 0.4, color: '#D97706', '&:hover': { color: '#B45309' } }}
                    >
                      <ClearRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>

                {/* Quick Upload Button */}
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(254, 240, 138, 0.4)',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 1.8,
                    height: '38px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Upload File
                </Button>

                {/* Print Price List Button */}
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handlePrintPriceList}
                  startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(254, 240, 138, 0.4)',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 1.8,
                    height: '38px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Print Sheet
                </Button>

                {/* Export Excel Button */}
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleExportExcel}
                  startIcon={<DownloadRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.18)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(254, 240, 138, 0.4)',
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 1.8,
                    height: '38px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  Export
                </Button>

                {/* Add Item Button */}
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleOpenAdd}
                  startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    color: '#B91C1C',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'none',
                    px: 2,
                    height: '38px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: '#F8FAFC',
                    },
                  }}
                >
                  Add Item
                </Button>
              </Box>
            </Box>

            {/* Category Pills Filter Bar */}
            <Box
              sx={{
                p: 1.5,
                px: { xs: 2, sm: 3 },
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mr: 0.5, flexShrink: 0 }}>
                Category:
              </Typography>

              <Chip
                label={`All Items (${items.length})`}
                onClick={() => setSelectedCategory('ALL')}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === 'ALL' ? '#B91C1C' : '#FFFFFF',
                  color: selectedCategory === 'ALL' ? '#FFFFFF' : '#475569',
                  border: selectedCategory === 'ALL' ? '1px solid #991B1B' : '1px solid #E2E8F0',
                  '&:hover': {
                    backgroundColor: selectedCategory === 'ALL' ? '#991B1B' : '#F1F5F9',
                  },
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
                      fontSize: '12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#B91C1C' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#57463A',
                      border: isSelected ? '1px solid #991B1B' : '1px solid #E5E7EB',
                      '&:hover': {
                        backgroundColor: isSelected ? '#991B1B' : '#F3F4F6',
                      },
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
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      p: 0.5,
                      '&:hover': { backgroundColor: '#FEE2E2' },
                    }}
                  >
                    <DeleteSweepRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Price List Table with explicit vertical scroll height */}
          <TableContainer
            sx={{
              height: { xs: 'auto', md: 'calc(100vh - 215px)' },
              maxHeight: { xs: '600px', md: 'calc(100vh - 215px)' },
              overflowX: 'auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Table stickyHeader sx={{ minWidth: { xs: '680px', sm: '100%' } }} aria-label="price list table">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableCell
                    sx={{
                      py: 1.5,
                      px: { xs: 2, sm: 3 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '70px',
                    }}
                  >
                    SL.NO
                  </TableCell>
                  <TableCell
                    sx={{
                      py: 1.5,
                      px: { xs: 2, sm: 3 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                    }}
                  >
                    ITEM NAME
                  </TableCell>
                  <TableCell
                    sx={{
                      py: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '180px',
                    }}
                  >
                    CATEGORY
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: { xs: 1, sm: 2 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '80px',
                    }}
                  >
                    UNIT
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      py: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '110px',
                    }}
                  >
                    MRP (₹)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: { xs: 1, sm: 2 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '90px',
                    }}
                  >
                    DISCOUNT
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      py: 1.5,
                      px: { xs: 2, sm: 3 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '130px',
                    }}
                  >
                    NET RATE (₹)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '80px',
                    }}
                  >
                    EDIT
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '0.04em',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      width: '80px',
                    }}
                  >
                    DELETE
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: '#DC2626' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#786C58' }}>
                      {searchTerm ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '14px', color: '#786C58', fontWeight: 500 }}>
                            No price list items matching "{searchTerm}" found.
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => setSearchTerm('')}
                            sx={{ textTransform: 'none', color: '#B91C1C', fontWeight: 700 }}
                          >
                            Clear Search
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                          <FilePresentRoundedIcon sx={{ fontSize: 44, color: '#D97706' }} />
                          <Typography sx={{ fontSize: '15px', color: '#786C58', fontWeight: 700 }}>
                            No items in price list yet.
                          </Typography>
                          <Typography sx={{ fontSize: '13px', color: '#9CA3AF' }}>
                            Upload an Excel, CSV, PDF, or Image file above to view prices.
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, index) => {
                    const isLast = index === filteredItems.length - 1;
                    return (
                      <TableRow
                        key={item._id || item.id || index}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#FEFDF5',
                          },
                        }}
                      >
                        {/* Sl. No */}
                        <TableCell
                          sx={{
                            py: 1.4,
                            px: { xs: 2, sm: 3 },
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: '#786C58',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          {item.slNo || index + 1}
                        </TableCell>

                        {/* Item Name */}
                        <TableCell
                          sx={{
                            py: 1.4,
                            px: { xs: 2, sm: 3 },
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#1F1714',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          {item.itemName}
                        </TableCell>

                        {/* Category */}
                        <TableCell
                          sx={{
                            py: 1.4,
                            px: { xs: 1.5, sm: 2.5 },
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          <Chip
                            label={item.category || 'General'}
                            size="small"
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              height: '24px',
                            }}
                          />
                        </TableCell>

                        {/* Unit */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.4,
                            px: { xs: 1, sm: 2 },
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#57463A',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          {item.unit || 'Box'}
                        </TableCell>

                        {/* MRP */}
                        <TableCell
                          align="right"
                          sx={{
                            py: 1.4,
                            px: { xs: 1.5, sm: 2.5 },
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: '#6B7280',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          {item.mrp ? `₹${Number(item.mrp).toLocaleString('en-IN')}` : '—'}
                        </TableCell>

                        {/* Discount % */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.4,
                            px: { xs: 1, sm: 2 },
                            fontSize: '13px',
                            fontWeight: 700,
                            color: item.discountPercent ? '#059669' : '#9CA3AF',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          {item.discountPercent ? `${item.discountPercent}%` : '—'}
                        </TableCell>

                        {/* Rate */}
                        <TableCell
                          align="right"
                          sx={{
                            py: 1.4,
                            px: { xs: 2, sm: 3 },
                            fontSize: '14.5px',
                            fontWeight: 800,
                            color: '#B91C1C',
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          ₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>

                        {/* Edit Action */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.4,
                            px: { xs: 1.5, sm: 2.5 },
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          <Tooltip title="Edit Item Price" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(item)}
                              sx={{
                                color: '#D97706',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                p: 0.6,
                                '&:hover': {
                                  color: '#FFFFFF',
                                  backgroundColor: '#D97706',
                                  borderColor: '#D97706',
                                },
                              }}
                            >
                              <ModeEditOutlineRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>

                        {/* Delete Action */}
                        <TableCell
                          align="center"
                          sx={{
                            py: 1.4,
                            px: { xs: 1.5, sm: 2.5 },
                            borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                          }}
                        >
                          <Tooltip title="Delete Item" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteItem(item)}
                              sx={{
                                color: '#DC2626',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '6px',
                                p: 0.6,
                                '&:hover': {
                                  color: '#FFFFFF',
                                  backgroundColor: '#DC2626',
                                  borderColor: '#DC2626',
                                },
                              }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* VIEW 2: Uploaded Documents & Catalogs (PDF / Images) */}
      {activeViewMode === 'documents' && (
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C' }}>
                Uploaded Price Documents & Rate Cards
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#786C58' }}>
                Access and view all your uploaded price sheet PDFs, images, and rate cards anytime.
              </Typography>
            </Box>
            <Button
              variant="contained"
              disableElevation
              onClick={() => fileInputRef.current?.click()}
              startIcon={<CloudUploadRoundedIcon />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '8px',
              }}
            >
              Upload New Document
            </Button>
          </Box>

          {uploadedDocs.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#786C58' }}>
              <PictureAsPdfRoundedIcon sx={{ fontSize: 48, color: '#D97706', mb: 1 }} />
              <Typography sx={{ fontSize: '15px', fontWeight: 700 }}>
                No PDF or Image rate cards uploaded yet.
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#9CA3AF', mt: 0.5 }}>
                Click "Upload File / PDF / Image" above to upload PDF price sheets or photo rate cards.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {uploadedDocs.map((doc) => (
                <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#D97706',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '10px',
                          backgroundColor: doc.type === 'pdf' ? '#FEF2F2' : doc.type === 'image' ? '#EFF6FF' : '#ECFDF5',
                          color: doc.type === 'pdf' ? '#DC2626' : doc.type === 'image' ? '#2563EB' : '#059669',
                          border: `1px solid ${doc.type === 'pdf' ? '#FECACA' : doc.type === 'image' ? '#BFDBFE' : '#A7F3D0'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {doc.type === 'pdf' ? (
                          <PictureAsPdfRoundedIcon sx={{ fontSize: 24 }} />
                        ) : doc.type === 'image' ? (
                          <ImageRoundedIcon sx={{ fontSize: 24 }} />
                        ) : (
                          <TableChartRoundedIcon sx={{ fontSize: 24 }} />
                        )}
                      </Box>
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography noWrap sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                          {doc.name}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: '#786C58' }}>
                          {doc.type.toUpperCase()} • {doc.size} • {doc.uploadDate}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Image Preview Thumbnail */}
                    {doc.type === 'image' && doc.dataUrl && (
                      <Box
                        component="img"
                        src={doc.dataUrl}
                        alt={doc.name}
                        sx={{
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                        }}
                      />
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                      {doc.dataUrl ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            setViewingDoc(doc);
                            setViewDocModalOpen(true);
                          }}
                          sx={{
                            borderColor: '#E2E8F0',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '12px',
                            textTransform: 'none',
                            borderRadius: '6px',
                            '&:hover': { backgroundColor: '#F8FAFC' },
                          }}
                        >
                          View Document
                        </Button>
                      ) : (
                        <Chip label="Imported Sheet" size="small" sx={{ fontSize: '11px', fontWeight: 700 }} />
                      )}

                      <IconButton
                        size="small"
                        onClick={() => handleDeleteDoc(doc.id)}
                        sx={{ color: '#DC2626', p: 0.6, '&:hover': { backgroundColor: '#FEF2F2' } }}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Live OCR / Scanning Progress Dialog */}
      <Dialog
        open={ocrLoading}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              p: 3,
              width: '420px',
              maxWidth: '90vw',
              textAlign: 'center',
              border: '1.5px solid #E2E8F0',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
            }}
          >
            <AutoFixHighRoundedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#991B1B' }}>
            AI OCR Scanning Rate Card...
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#786C58' }}>
            {ocrStatusText || 'Extracting products, categories, and rates from document...'}
          </Typography>
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={ocrProgress || 30}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { backgroundColor: '#DC2626' },
              }}
            />
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#334155', mt: 0.8, textAlign: 'right' }}>
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
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #E2E8F0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C', pb: 0.5 }}>
          Paste Price List Text (WhatsApp / Notes / SMS)
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Typography sx={{ fontSize: '13px', color: '#786C58', mb: 1.5 }}>
            Paste any price list text from WhatsApp, Excel, or SMS below. The AI parser will automatically extract product names, rates, and categories!
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder={`Example:
ONE SOUND CRACKERS
1. 2 3/4" Kuruvi Crackers - 1 Box - Rs. 45
2. 3 1/2" Lakshmi Crackers - 1 Pkt - Rs. 65

SPARKLERS
3. 10 cm Electric Sparklers - 1 Box - Rs. 35
4. 15 cm Color Sparklers - 1 Box - Rs. 75`}
            value={pasteTextContent}
            onChange={(e) => setPasteTextContent(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setPasteModalOpen(false)}
            sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleExtractFromPasteText}
            startIcon={<AutoFixHighRoundedIcon />}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              textTransform: 'none',
              px: 3,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            Extract & Sync Products
          </Button>
        </DialogActions>
      </Dialog>

      {/* Interactive & Editable Upload Preview Dialog (PDF, Excel, Images, Pasted Text) */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => !uploading && setUploadModalOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #E2E8F0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C', pb: 0.5 }}>
          Preview & Edit Detected Price Items ({previewItems.length} Products Found)
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckCircleRoundedIcon sx={{ color: '#059669 !important' }} />}
              label={`Found ${previewItems.length} valid product rows`}
              sx={{ backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700 }}
            />
            <Chip
              label={`Source: ${uploadFileName}`}
              sx={{ backgroundColor: '#F8FAFC', color: '#334155', fontWeight: 600 }}
            />
            <Typography sx={{ fontSize: '12.5px', color: '#786C58', ml: 'auto' }}>
              💡 <em>You can edit any row or add new items below before syncing!</em>
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Batch / Catalog Label
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={uploadBatchName}
                onChange={(e) => setUploadBatchName(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    color="error"
                  />
                }
                label={
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>
                    Replace existing price list (Uncheck to merge/append into current catalog)
                  </Typography>
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5, borderColor: '#E2E8F0' }} />

          {/* Fully Interactive & Editable Table Container */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid #E5E7EB', maxHeight: '380px', overflowY: 'auto' }}
          >
            <Table size="small" stickyHeader>
              <TableHead sx={{ backgroundColor: '#F9FAFB' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', width: '60px' }}>SL</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', minWidth: '220px' }}>
                    ITEM / PRODUCT NAME *
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', width: '180px' }}>
                    CATEGORY
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', width: '90px' }}>UNIT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', width: '100px' }}>MRP (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11.5px', width: '110px', color: '#B91C1C' }}>
                    RATE (₹) *
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '11.5px', width: '50px' }}>
                    DEL
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewItems.map((p, i) => (
                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: '#FFFFFF' } }}>
                    <TableCell sx={{ fontSize: '12px', color: '#6B7280' }}>
                      {p.slNo || i + 1}
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={p.itemName || ''}
                        onChange={(e) => handleUpdatePreviewItem(i, 'itemName', e.target.value)}
                        slotProps={{ input: { sx: { fontSize: '12.5px', fontWeight: 600 } } }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={p.category || 'General'}
                          onChange={(e) => handleUpdatePreviewItem(i, 'category', e.target.value)}
                          sx={{ fontSize: '12.5px' }}
                        >
                          {categories.map((c) => (
                            <MenuItem key={c.name} value={c.name}>
                              {c.name}
                            </MenuItem>
                          ))}
                          {categories.every((c) => c.name !== p.category) && (
                            <MenuItem value={p.category || 'General'}>{p.category || 'General'}</MenuItem>
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={p.unit || 'Box'}
                        onChange={(e) => handleUpdatePreviewItem(i, 'unit', e.target.value)}
                        slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={p.mrp || 0}
                        onChange={(e) => handleUpdatePreviewItem(i, 'mrp', Number(e.target.value))}
                        slotProps={{ input: { sx: { fontSize: '12.5px' } } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={p.rate || 0}
                        onChange={(e) => handleUpdatePreviewItem(i, 'rate', Number(e.target.value))}
                        slotProps={{
                          input: {
                            sx: { fontSize: '13px', fontWeight: 800, color: '#B91C1C' },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePreviewItem(i)}
                        sx={{ color: '#DC2626', p: 0.4 }}
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              size="small"
              onClick={handleAddPreviewRow}
              startIcon={<AddRoundedIcon />}
              sx={{
                color: '#334155',
                fontWeight: 700,
                fontSize: '12.5px',
                textTransform: 'none',
              }}
            >
              + Add Another Product Row
            </Button>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
              Total: {previewItems.length} Products ready to sync
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between' }}>
          <Button
            onClick={() => setUploadModalOpen(false)}
            disabled={uploading}
            sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleConfirmSpreadsheetUpload}
            disabled={uploading || previewItems.length === 0}
            startIcon={
              uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadRoundedIcon />
            }
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              textTransform: 'none',
              px: 3.5,
              py: 1,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
            }}
          >
            {uploading
              ? 'Syncing to Database...'
              : `Confirm & Sync All ${previewItems.length} Products & Categories`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEW: PDF & Image Upload Confirmation Modal with Direct Quick-Entry & Upload Action */}
      {docUploadModalOpen && pendingDocUpload && (
        <Dialog
          open={docUploadModalOpen}
          onClose={() => setDocUploadModalOpen(false)}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '14px',
                p: 1,
                border: '1.5px solid #E2E8F0',
                overflow: 'hidden',
              },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C', pb: 0.5 }}>
            Upload Rate Card ({pendingDocUpload.type === 'pdf' ? 'PDF Document' : 'Photo / Image'})
          </DialogTitle>
          <DialogContent sx={{ pt: '10px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                label={`Format: ${pendingDocUpload.type.toUpperCase()}`}
                sx={{ backgroundColor: '#F1F5F9', color: '#334155', fontWeight: 700 }}
              />
              <Chip
                label={`Size: ${pendingDocUpload.size}`}
                sx={{ backgroundColor: '#F3F4F6', color: '#374151', fontWeight: 600 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Rate Card / Document Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. 2024 Diwali Wholesale Rate Card"
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Box>

            {/* Document / Image Preview Window */}
            <Box
              sx={{
                width: '100%',
                maxHeight: '260px',
                minHeight: '160px',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              {pendingDocUpload.type === 'image' && pendingDocUpload.dataUrl ? (
                <Box
                  component="img"
                  src={pendingDocUpload.dataUrl}
                  alt={pendingDocUpload.name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    objectFit: 'contain',
                  }}
                />
              ) : pendingDocUpload.type === 'pdf' && pendingDocUpload.dataUrl ? (
                <iframe
                  src={pendingDocUpload.dataUrl}
                  title="PDF Preview"
                  width="100%"
                  height="260px"
                  style={{ border: 'none' }}
                />
              ) : (
                <Typography sx={{ color: '#64748B' }}>File ready to upload</Typography>
              )}
            </Box>

            {/* Optional Quick Add Item from this Rate Card to Live Database */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                border: '1px dashed #F59E0B',
              }}
            >
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#334155', mb: 1 }}>
                ✍️ Optional: Add Product Rates from this image into your Price List table:
              </Typography>
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Product Name (e.g. 2 3/4 Kuruvi)"
                    value={quickItemName}
                    onChange={(e) => setQuickItemName(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '12.5px', fontWeight: 600 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      sx={{ fontSize: '12.5px', fontWeight: 600 }}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.name} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                      {categories.every((c) => c.name !== quickCategory) && (
                        <MenuItem value={quickCategory}>{quickCategory}</MenuItem>
                      )}
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
                    slotProps={{ input: { sx: { fontSize: '12.5px', fontWeight: 700, color: '#B91C1C' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 3, sm: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Unit"
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                    slotProps={{ input: { sx: { fontSize: '12.5px', fontWeight: 600 } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1.5 }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    onClick={handleQuickAddProductFromDoc}
                    disabled={quickSaving || !quickItemName.trim() || !quickRate}
                    sx={{
                      borderColor: '#D97706',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      textTransform: 'none',
                      height: '36px',
                      borderRadius: '6px',
                      '&:hover': { backgroundColor: '#F8FAFC' },
                    }}
                  >
                    + Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button
              onClick={() => setDocUploadModalOpen(false)}
              sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={handleConfirmDocUpload}
              startIcon={<CloudUploadRoundedIcon />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                textTransform: 'none',
                px: 3,
                borderRadius: '8px',
                '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
              }}
            >
              Confirm & Upload Rate Card
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
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1.5px solid #E2E8F0',
                height: '85vh',
                display: 'flex',
                flexDirection: 'column',
              },
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              borderBottom: '2px solid #F59E0B',
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FFFFFF',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {viewingDoc.type === 'pdf' ? (
                <PictureAsPdfRoundedIcon sx={{ color: '#FEF08A' }} />
              ) : (
                <ImageRoundedIcon sx={{ color: '#FEF08A' }} />
              )}
              <Typography sx={{ fontSize: '16px', fontWeight: 800 }}>
                {viewingDoc.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {viewingDoc.dataUrl && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const win = window.open(viewingDoc.dataUrl, '_blank');
                    win?.focus();
                  }}
                  startIcon={<PrintOutlinedIcon />}
                  sx={{
                    backgroundColor: '#FEF08A',
                    color: '#1E293B',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '6px',
                    '&:hover': { backgroundColor: '#E2E8F0' },
                  }}
                >
                  Open in New Tab / Print
                </Button>
              )}
              <IconButton onClick={() => setViewDocModalOpen(false)} sx={{ color: '#FFFFFF' }}>
                <ClearRoundedIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Body Viewer */}
          <DialogContent sx={{ p: 0, flex: 1, backgroundColor: '#1E293B', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
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
                  p: 2,
                }}
              />
            ) : (
              <Typography sx={{ color: '#FFFFFF' }}>Unable to preview document.</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 1.5, backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                handleDeleteDoc(viewingDoc.id);
                setViewDocModalOpen(false);
              }}
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '6px' }}
            >
              Delete Rate Card
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setViewDocModalOpen(false);
                  fileInputRef.current?.click();
                }}
                startIcon={<CloudUploadRoundedIcon />}
                sx={{
                  borderColor: '#D97706',
                  color: '#334155',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                }}
              >
                Upload Another File
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setViewDocModalOpen(false)}
                sx={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 2.5,
                }}
              >
                Done / Close
              </Button>
            </Box>
          </DialogActions>
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
              borderRadius: '14px',
              p: 1,
              border: '1.5px solid #E2E8F0',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: '18px', fontWeight: 800, color: '#B91C1C', pb: 1 }}>
          {editingItem ? 'Edit Price Item' : 'Add Price List Item'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Sl No
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formSlNo}
                onChange={(e) => setFormSlNo(Number(e.target.value))}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Category
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  sx={{ fontSize: '13.5px', fontWeight: 600 }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                  {categories.every((c) => c.name !== formCategory) && (
                    <MenuItem value={formCategory}>{formCategory}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
              Item / Product Name *
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="e.g. 2 3/4 Kuruvi, Ground Chakkar Deluxe..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Unit
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Box, Pcs, Pkt"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                MRP (₹)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formMrp}
                onChange={(e) => handleMrpChange(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#786C58', mb: 0.6 }}>
                Discount (%)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formDiscount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '13.5px', fontWeight: 600 } } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C', mb: 0.6 }}>
                Net Rate (₹) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                slotProps={{ input: { sx: { fontSize: '14px', fontWeight: 800, color: '#B91C1C' } } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setItemModalOpen(false)}
            sx={{ color: '#786C58', fontWeight: 600, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSaveItem}
            disabled={savingItem}
            sx={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              borderRadius: '8px',
              '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
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
          sx={{ width: '100%', fontWeight: 700, borderRadius: '10px' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
