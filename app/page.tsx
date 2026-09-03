'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bike,
  CalendarClock,
  CarFront,
  Check,
  ChevronRight,
  CircleGauge,
  Clock3,
  Euro,
  Fuel,
  ImagePlus,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Settings2,
  Sparkles,
  Trash2,
  Utensils,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Section = 'dashboard' | 'spese' | 'mezzi' | 'lavoro';
type Vehicle = 'Macchina' | 'Moto' | 'Altro';
type Expense = {
  id: string;
  store: string;
  category: string;
  amount: number;
  date: string;
  vehicle?: Vehicle;
  vehicleNote?: string;
  items?: string;
  receipt?: string;
};
type WorkEntry = {
  id: string;
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
};
type Deadline = {
  id: string;
  vehicle: 'Macchina' | 'Moto';
  label: string;
  date: string;
};
type Settings = {
  openingBalance: number;
  hourlyRate: number;
  mealMinHours: number;
  mealValue: number;
};
type Appearance = {
  theme: 'system' | 'light' | 'dark';
  font: keyof typeof FONT_STACKS;
  brandColor: string;
  accentColor: string;
  highlightColor: string;
};
type ToolRegistration = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};

const STORAGE_KEY = 'crimi-life-organiser-v1';
const CATEGORIES = [
  'Spesa',
  'Carburante',
  'Benzina',
  'Gasolio',
  'Manutenzione',
  'Abbigliamento',
  'Svago',
  'Casa',
  'Salute',
  'Altro',
];
const VEHICLE_CATEGORIES = new Set([
  'Carburante',
  'Benzina',
  'Gasolio',
  'Manutenzione',
]);
const COLORS: Record<string, string> = {
  Spesa: '#ff6b4a',
  Carburante: '#18a999',
  Benzina: '#18a999',
  Gasolio: '#147d73',
  Manutenzione: '#7657e5',
  Abbigliamento: '#e29b29',
  Svago: '#4f46e5',
  Casa: '#d7df23',
  Salute: '#e84d86',
  Altro: '#83908c',
};

const initialExpenses: Expense[] = [
  {
    id: 'e1',
    store: 'Coop',
    category: 'Spesa',
    amount: 48.7,
    date: '2026-09-03',
    items: 'Frutta, verdura, pasta, latte',
  },
  {
    id: 'e2',
    store: 'Eni Station',
    category: 'Carburante',
    amount: 72,
    date: '2026-09-02',
    vehicle: 'Macchina',
  },
  {
    id: 'e3',
    store: 'Cinema Astra',
    category: 'Svago',
    amount: 24,
    date: '2026-08-30',
  },
  {
    id: 'e4',
    store: 'Zara',
    category: 'Abbigliamento',
    amount: 89.9,
    date: '2026-08-28',
  },
  {
    id: 'e5',
    store: 'Officina Rossi',
    category: 'Manutenzione',
    amount: 145,
    date: '2026-08-24',
    vehicle: 'Moto',
  },
  {
    id: 'e6',
    store: 'Conad',
    category: 'Spesa',
    amount: 63.2,
    date: '2026-08-21',
  },
];

const initialWork: WorkEntry[] = [
  {
    id: 'w1',
    date: '2026-09-01',
    start: '08:30',
    end: '17:30',
    breakMinutes: 60,
  },
  {
    id: 'w2',
    date: '2026-09-02',
    start: '08:15',
    end: '17:15',
    breakMinutes: 45,
  },
  {
    id: 'w3',
    date: '2026-09-03',
    start: '08:30',
    end: '16:45',
    breakMinutes: 45,
  },
];

const initialDeadlines: Deadline[] = [
  { id: 'd1', vehicle: 'Macchina', label: 'Assicurazione', date: '2026-09-24' },
  { id: 'd2', vehicle: 'Macchina', label: 'Revisione', date: '2027-02-18' },
  { id: 'd3', vehicle: 'Moto', label: 'Bollo', date: '2026-10-10' },
  { id: 'd4', vehicle: 'Moto', label: 'Tagliando', date: '2026-11-04' },
];

const initialSettings: Settings = {
  openingBalance: 3200,
  hourlyRate: 12.5,
  mealMinHours: 6,
  mealValue: 7,
};

const FONT_STACKS = {
  geist: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
  system:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  rounded: 'Trebuchet MS, Arial, sans-serif',
  editorial: 'Georgia, Times New Roman, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

const initialAppearance: Appearance = {
  theme: 'system',
  font: 'geist',
  brandColor: '#142f2a',
  accentColor: '#d7df23',
  highlightColor: '#ff6b4a',
};

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
});
const shortDate = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
});

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function hoursFor(entry: WorkEntry) {
  const [sh, sm] = entry.start.split(':').map(Number);
  const [eh, em] = entry.end.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return Math.max(0, (minutes - entry.breakMinutes) / 60);
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000,
  );
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return { r: 20, g: 47, b: 42 };
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (value: number) =>
    Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

async function compressReceipt(file: File) {
  if (!file.type.startsWith('image/')) return '';
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

export default function Home() {
  const [section, setSection] = useState<Section>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>(initialWork);
  const [deadlines, setDeadlines] = useState<Deadline[]>(initialDeadlines);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [deadlineVehicle, setDeadlineVehicle] = useState<
    'Macchina' | 'Moto' | null
  >(null);
  const [notice, setNotice] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({
    store: '',
    category: 'Spesa',
    amount: '',
    date: '2026-09-03',
    vehicle: 'Macchina' as Vehicle,
    vehicleNote: '',
    items: '',
    receipt: '',
  });
  const [workDraft, setWorkDraft] = useState({
    date: '2026-09-03',
    start: '08:30',
    end: '17:30',
    breakMinutes: '60',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Partial<{
          expenses: Expense[];
          workEntries: WorkEntry[];
          deadlines: Deadline[];
          settings: Settings;
          appearance: Appearance;
        }>;
        if (data.expenses) setExpenses(data.expenses);
        if (data.workEntries) setWorkEntries(data.workEntries);
        if (data.deadlines) setDeadlines(data.deadlines);
        if (data.settings) setSettings(data.settings);
        if (data.appearance)
          setAppearance({ ...initialAppearance, ...data.appearance });
      }
    } catch {
      setNotice('Non è stato possibile leggere i dati salvati.');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          expenses,
          workEntries,
          deadlines,
          settings,
          appearance,
        }),
      );
    } catch {
      setNotice('Spazio locale esaurito: rimuovi alcune foto degli scontrini.');
    }
  }, [appearance, deadlines, expenses, hydrated, settings, workEntries]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyAppearance = () => {
      const dark =
        appearance.theme === 'dark' ||
        (appearance.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      root.style.setProperty('--font-app', FONT_STACKS[appearance.font]);
      root.style.setProperty('--ink', appearance.brandColor);
      root.style.setProperty('--primary', appearance.brandColor);
      root.style.setProperty('--lime', appearance.accentColor);
      root.style.setProperty('--ring', appearance.accentColor);
      root.style.setProperty('--coral', appearance.highlightColor);
    };
    applyAppearance();
    if (appearance.theme !== 'system') return undefined;
    media.addEventListener('change', applyAppearance);
    return () => media.removeEventListener('change', applyAppearance);
  }, [appearance]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const serviceWorkerUrl = new URL(
      './service-worker.js',
      window.location.href,
    );
    void navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then(async (registration) => {
        if (Notification.permission !== 'granted') return;
        const urgent = deadlines.filter(
          (item) => daysUntil(item.date) >= 0 && daysUntil(item.date) <= 30,
        );
        const lastCheck = localStorage.getItem('crimi-notification-check');
        const today = new Date().toISOString().slice(0, 10);
        if (urgent.length && lastCheck !== today) {
          await registration.showNotification('Scadenze Crimi', {
            body: `${urgent.length} ${urgent.length === 1 ? 'scadenza richiede' : 'scadenze richiedono'} la tua attenzione.`,
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: 'crimi-deadlines',
          });
          localStorage.setItem('crimi-notification-check', today);
        }
      })
      .catch(() =>
        setNotice('Modalità offline non disponibile in questo browser.'),
      );
  }, [deadlines]);

  const month = currentMonthKey();
  const monthExpenses = useMemo(
    () => expenses.filter((item) => item.date.startsWith(month)),
    [expenses, month],
  );
  const monthWork = useMemo(
    () => workEntries.filter((item) => item.date.startsWith(month)),
    [workEntries, month],
  );
  const monthExpenseTotal = useMemo(
    () => monthExpenses.reduce((sum, item) => sum + item.amount, 0),
    [monthExpenses],
  );
  const totalHours = useMemo(
    () => monthWork.reduce((sum, item) => sum + hoursFor(item), 0),
    [monthWork],
  );
  const mealCount = useMemo(() => {
    const daily = monthWork.reduce<Record<string, number>>(
      (acc, item) => ({
        ...acc,
        [item.date]: (acc[item.date] ?? 0) + hoursFor(item),
      }),
      {},
    );
    return Object.values(daily).filter(
      (hours) => hours >= settings.mealMinHours,
    ).length;
  }, [monthWork, settings.mealMinHours]);
  const wage = totalHours * settings.hourlyRate;
  const benefits = mealCount * settings.mealValue;
  const availableBalance = settings.openingBalance + wage - monthExpenseTotal;

  const categoryData = useMemo(() => {
    const grouped = monthExpenses.reduce<Record<string, number>>(
      (acc, item) => ({
        ...acc,
        [item.category]: (acc[item.category] ?? 0) + item.amount,
      }),
      {},
    );
    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        color: COLORS[name] ?? COLORS.Altro,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const smartAdvice = useMemo(() => {
    if (!monthExpenseTotal)
      return 'Registra la prima spesa: i consigli diventeranno più precisi man mano che usi l’app.';
    const top = categoryData[0];
    const share = top ? Math.round((top.value / monthExpenseTotal) * 100) : 0;
    if (share >= 40)
      return `${top.name} pesa per il ${share}% delle uscite. Un tetto del 10% più basso libererebbe circa ${euro.format(top.value * 0.1)}.`;
    if (wage > 0 && monthExpenseTotal / wage < 0.6)
      return `Stai trattenendo il ${Math.round((1 - monthExpenseTotal / wage) * 100)}% delle entrate stimate. Spostarne il 20% in risparmio automatico consolida il risultato.`;
    return `Le uscite sono distribuite bene. Controlla ${top?.name ?? 'le spese'}: è la categoria con il margine di ottimizzazione maggiore.`;
  }, [categoryData, monthExpenseTotal, wage]);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    const created = { ...expense, id: uid('expense') };
    setExpenses((current) => [created, ...current]);
    return created;
  }, []);

  const addWorkEntry = useCallback((entry: Omit<WorkEntry, 'id'>) => {
    const created = { ...entry, id: uid('work') };
    setWorkEntries((current) => [created, ...current]);
    return created;
  }, []);

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: ToolRegistration,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'create_expense',
            title: 'Registra spesa',
            description:
              'Registra una nuova spesa e aggiorna dashboard, grafici e registro.',
            inputSchema: {
              type: 'object',
              properties: {
                store: { type: 'string' },
                category: { type: 'string', enum: CATEGORIES },
                amount: { type: 'number', exclusiveMinimum: 0 },
                date: { type: 'string', format: 'date' },
                vehicle: {
                  type: 'string',
                  enum: ['Macchina', 'Moto', 'Altro'],
                },
                items: { type: 'string' },
              },
              required: ['store', 'category', 'amount', 'date'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              const value = input as Partial<Expense>;
              if (
                !value.store?.trim() ||
                !value.category ||
                !CATEGORIES.includes(value.category) ||
                !value.amount ||
                value.amount <= 0 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(value.date ?? '')
              )
                throw new Error('Dati della spesa non validi.');
              if (VEHICLE_CATEGORIES.has(value.category) && !value.vehicle)
                throw new Error('Indica il mezzo per questa categoria.');
              const item = addExpense({
                store: value.store.trim(),
                category: value.category,
                amount: value.amount,
                date: value.date!,
                vehicle: value.vehicle,
                items: value.items?.trim(),
              });
              setNotice(`Spesa da ${euro.format(item.amount)} registrata.`);
              return { id: item.id, status: 'saved', total: item.amount };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
      void Promise.resolve(
        context.registerTool(
          {
            name: 'create_work_entry',
            title: 'Registra ore lavorate',
            description:
              'Aggiunge una giornata lavorativa e aggiorna paga e buoni pasto.',
            inputSchema: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                start: {
                  type: 'string',
                  pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
                },
                end: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
                breakMinutes: { type: 'number', minimum: 0 },
              },
              required: ['date', 'start', 'end', 'breakMinutes'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              const value = input as Partial<WorkEntry>;
              if (
                !value.date ||
                !value.start ||
                !value.end ||
                value.breakMinutes === undefined ||
                value.breakMinutes < 0
              )
                throw new Error('Dati delle ore non validi.');
              const item = addWorkEntry({
                date: value.date,
                start: value.start,
                end: value.end,
                breakMinutes: value.breakMinutes,
              });
              return { id: item.id, status: 'saved', hours: hoursFor(item) };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
    } catch {
      /* API sperimentale: l'interfaccia resta pienamente utilizzabile. */
    }
    return () => lifecycle.abort();
  }, [addExpense, addWorkEntry]);

  async function requestNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotice('Le notifiche non sono supportate da questo browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Crimi è pronto', {
        body: 'Riceverai un avviso quando una scadenza si avvicina.',
        icon: './icon-192.png',
        tag: 'crimi-welcome',
      });
      setNotice('Notifiche attivate.');
    } else setNotice('Permesso notifiche non concesso.');
  }

  async function onReceipt(file?: File) {
    if (!file) return;
    try {
      const compressed = await compressReceipt(file);
      if (compressed.length > 1_200_000)
        setNotice('Immagine troppo grande: prova con una foto più leggera.');
      else setExpenseDraft((draft) => ({ ...draft, receipt: compressed }));
    } catch {
      setNotice('Non è stato possibile elaborare la foto.');
    }
  }

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(expenseDraft.amount.replace(',', '.'));
    if (!expenseDraft.store.trim() || !amount || amount <= 0) {
      setNotice('Inserisci negozio e importo valido.');
      return;
    }
    const needsVehicle = VEHICLE_CATEGORIES.has(expenseDraft.category);
    addExpense({
      store: expenseDraft.store.trim(),
      category: expenseDraft.category,
      amount,
      date: expenseDraft.date,
      vehicle: needsVehicle ? expenseDraft.vehicle : undefined,
      vehicleNote:
        needsVehicle && expenseDraft.vehicle === 'Altro'
          ? expenseDraft.vehicleNote.trim()
          : undefined,
      items: expenseDraft.items.trim() || undefined,
      receipt: expenseDraft.receipt || undefined,
    });
    setExpenseDraft({
      store: '',
      category: 'Spesa',
      amount: '',
      date: expenseDraft.date,
      vehicle: 'Macchina',
      vehicleNote: '',
      items: '',
      receipt: '',
    });
    setExpenseOpen(false);
    setNotice('Spesa registrata e grafici aggiornati.');
  }

  function submitWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = addWorkEntry({
      date: workDraft.date,
      start: workDraft.start,
      end: workDraft.end,
      breakMinutes: Number(workDraft.breakMinutes) || 0,
    });
    setNotice(
      `${hoursFor(entry).toLocaleString('it-IT', { maximumFractionDigits: 2 })} ore aggiunte al mese.`,
    );
  }

  const vehicleSpend = (vehicle: 'Macchina' | 'Moto') =>
    expenses
      .filter((item) => item.vehicle === vehicle)
      .reduce((sum, item) => sum + item.amount, 0);
  const navItems: {
    value: Section;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'spese', label: 'Spese', icon: ReceiptText },
    { value: 'mezzi', label: 'Mezzi', icon: CarFront },
    { value: 'lavoro', label: 'Lavoro', icon: Clock3 },
  ];

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground lg:pb-10">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            className="flex items-center gap-3 text-left"
            type="button"
            onClick={() => setSection('dashboard')}
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-lime text-ink shadow-[0_0_0_5px_rgba(215,223,35,.12)]">
              <CircleGauge className="size-5" strokeWidth={2.4} />
            </span>
            <span>
              <span className="block text-[0.7rem] font-bold uppercase tracking-[0.22em] text-white/55">
                Crimi
              </span>
              <span className="block font-heading text-lg font-extrabold tracking-[-0.035em]">
                Life Organiser
              </span>
            </span>
          </button>
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ value, label }) => (
              <Button
                key={value}
                variant="ghost"
                onClick={() => setSection(value)}
                className={
                  section === value
                    ? 'bg-white/10 font-bold text-lime hover:bg-white/10 hover:text-lime'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Attiva notifiche"
              onClick={requestNotifications}
              size="icon-lg"
              variant="ghost"
              className="relative rounded-2xl text-white hover:bg-white/10 hover:text-white"
            >
              <Bell />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-coral ring-2 ring-ink" />
            </Button>
            <Button
              aria-label="Apri impostazioni"
              onClick={() => setAppearanceOpen(true)}
              variant="ghost"
              className="h-10 rounded-2xl px-3 text-white hover:bg-white/10 hover:text-white"
            >
              <Settings2 />
              <span className="hidden sm:inline">Impostazioni</span>
            </Button>
            <Button
              onClick={() => setExpenseOpen(true)}
              className="hidden h-10 rounded-2xl bg-lime px-4 font-bold text-ink hover:bg-lime/85 sm:inline-flex"
            >
              <Plus /> Nuova spesa
            </Button>
          </div>
        </div>
      </header>

      {notice && (
        <output className="fixed left-1/2 top-20 z-[70] flex w-[min(92vw,480px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-white p-3 pl-4 text-sm font-semibold text-ink shadow-2xl ring-1 ring-ink/10">
          <span className="flex items-center gap-2">
            <Check className="size-4 text-teal" />
            {notice}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setNotice('')}>
            Chiudi
          </Button>
        </output>
      )}

      <Tabs
        value={section}
        onValueChange={(value) => setSection(value as Section)}
        className="mx-auto max-w-7xl"
      >
        <TabsList className="sr-only">
          {navItems.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="dashboard"
          className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)] lg:px-8 lg:py-8"
        >
          <section className="space-y-6">
            <Card className="relative min-h-[292px] overflow-hidden rounded-[2rem] border-0 bg-ink text-white shadow-[0_24px_70px_rgba(20,47,42,.18)] ring-0">
              <div className="absolute -right-10 -top-16 size-64 rounded-full border-[46px] border-teal/30" />
              <div className="absolute bottom-0 right-[22%] size-28 translate-y-1/2 rotate-12 rounded-[2.5rem] bg-coral/90" />
              <CardContent className="relative flex min-h-[292px] flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white/60">
                      Saldo disponibile
                    </p>
                    <p className="mt-3 font-heading text-4xl font-black tracking-[-0.06em] sm:text-6xl">
                      {euro.format(availableBalance)}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-lime">
                      <ArrowUpRight className="size-4" />{' '}
                      {euro.format(wage - monthExpenseTotal)} questo mese
                    </p>
                  </div>
                  <WalletCards className="size-7 text-white/60" />
                </div>
                <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-md">
                  <Metric label="Entrate stimate" value={euro.format(wage)} />
                  <Metric
                    label="Uscite"
                    value={euro.format(monthExpenseTotal)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
                <CardHeader className="flex-row items-center justify-between px-5 pt-5">
                  <CardTitle className="font-heading text-xl font-extrabold tracking-tight">
                    Dove spendi
                  </CardTitle>
                  <Badge className="bg-coral/10 text-coral">
                    MESE CORRENTE
                  </Badge>
                </CardHeader>
                <CardContent className="grid min-h-[205px] grid-cols-[145px_1fr] items-center gap-2 px-4 pb-5">
                  {categoryData.length ? (
                    <>
                      <div className="relative h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="value"
                              innerRadius={45}
                              outerRadius={67}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {categoryData.map((item) => (
                                <Cell key={item.name} fill={item.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Totale
                          </span>
                          <strong className="text-base">
                            {euro.format(monthExpenseTotal)}
                          </strong>
                        </div>
                      </div>
                      <ul className="space-y-2.5">
                        {categoryData.slice(0, 5).map((item) => (
                          <li
                            key={item.name}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 font-semibold">
                              <i
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: item.color }}
                              />
                              <span className="truncate">{item.name}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {euro.format(item.value)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <EmptyState text="Aggiungi una spesa per vedere il grafico." />
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
                <CardHeader className="px-5 pt-5">
                  <CardTitle className="font-heading text-xl font-extrabold tracking-tight">
                    Entrate vs uscite
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[220px] px-3 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Entrate', value: wage, fill: '#142f2a' },
                        {
                          name: 'Uscite',
                          value: monthExpenseTotal,
                          fill: '#ff6b4a',
                        },
                      ]}
                      barSize={46}
                      margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="#e9ebe7"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: '#65736f',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: '#f2f4ef' }}
                        formatter={(value) => [
                          euro.format(Number(value)),
                          'Totale',
                        ]}
                        contentStyle={{
                          borderRadius: 14,
                          border: 'none',
                          boxShadow: '0 12px 30px rgba(20,47,42,.12)',
                        }}
                      />
                      <Bar dataKey="value" radius={[14, 14, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="space-y-5">
            <Card className="rounded-[1.75rem] border-0 bg-lime shadow-sm ring-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-ink text-lime">
                    <Sparkles className="size-5" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-ink/55">
                    Consiglio smart Crimi
                  </span>
                </div>
                <h2 className="mt-5 font-heading text-2xl font-black leading-tight tracking-[-0.04em] text-ink">
                  Il tuo prossimo passo.
                </h2>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/70">
                  {smartAdvice}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSection('spese')}
                  className="mt-4 -ml-2 font-bold text-ink hover:bg-ink/8"
                >
                  Analizza le spese <ChevronRight />
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
              <CardHeader className="flex-row items-center justify-between px-5 pt-5">
                <CardTitle className="font-heading text-xl font-extrabold tracking-tight">
                  Ultime spese
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSection('spese')}
                  className="font-bold text-teal"
                >
                  Vedi tutte
                </Button>
              </CardHeader>
              <CardContent className="space-y-1 px-3 pb-3">
                {expenses.slice(0, 3).map((item) => (
                  <ExpenseRow key={item.id} expense={item} />
                ))}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <QuickCard
                color="bg-teal"
                icon={CarFront}
                title="I miei mezzi"
                text={`${deadlines.filter((d) => daysUntil(d.date) <= 45).length} scadenze vicine`}
                onClick={() => setSection('mezzi')}
              />
              <QuickCard
                color="bg-coral"
                icon={Clock3}
                title="Lavoro"
                text={`${totalHours.toLocaleString('it-IT', { maximumFractionDigits: 1 })} ore`}
                onClick={() => setSection('lavoro')}
              />
            </div>
          </aside>
        </TabsContent>

        <TabsContent
          value="spese"
          className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
        >
          <PageHeading
            eyebrow="Registro scontrini"
            title="Spese sotto controllo"
            description="Ogni acquisto aggiorna saldo, categorie, mezzi e consigli in tempo reale."
            action={
              <Button
                onClick={() => setExpenseOpen(true)}
                className="h-11 rounded-2xl bg-coral px-4 font-bold text-white hover:bg-coral/90"
              >
                <Plus /> Registra acquisto
              </Button>
            }
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard
                icon={ArrowDownRight}
                label="Uscite del mese"
                value={euro.format(monthExpenseTotal)}
                color="bg-coral"
              />
              <SummaryCard
                icon={ReceiptText}
                label="Acquisti registrati"
                value={String(monthExpenses.length)}
                color="bg-teal"
              />
              <SummaryCard
                icon={Sparkles}
                label="Categoria principale"
                value={categoryData[0]?.name ?? '—'}
                color="bg-ink"
              />
            </div>
            <Card className="rounded-[1.75rem] border-0 shadow-sm ring-1 ring-ink/7">
              <CardHeader className="border-b border-border px-5 py-5">
                <CardTitle className="font-heading text-xl font-extrabold">
                  Movimenti
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border px-3 pb-2">
                {expenses.length ? (
                  expenses.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-2 py-4"
                    >
                      <ExpenseRow expense={item} expanded />
                      <Button
                        aria-label={`Elimina ${item.store}`}
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setExpenses((all) =>
                            all.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyState text="Nessuna spesa registrata." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="mezzi"
          className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
        >
          <PageHeading
            eyebrow="Garage Crimi"
            title="Macchina & moto"
            description="Costi collegati e scadenze importanti, riuniti per ogni mezzo."
            action={
              <Button
                onClick={requestNotifications}
                className="h-11 rounded-2xl bg-lime px-4 font-bold text-ink hover:bg-lime/85"
              >
                <Bell /> Attiva avvisi
              </Button>
            }
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {(['Macchina', 'Moto'] as const).map((vehicle) => {
              const vehicleDeadlines = deadlines
                .filter((item) => item.vehicle === vehicle)
                .sort((a, b) => a.date.localeCompare(b.date));
              const VehicleIcon = vehicle === 'Macchina' ? CarFront : Bike;
              return (
                <Card
                  key={vehicle}
                  className="rounded-[2rem] border-0 shadow-sm ring-1 ring-ink/7"
                >
                  <CardHeader className="bg-ink px-6 py-6 text-white">
                    <div className="flex items-center justify-between">
                      <span className="grid size-12 place-items-center rounded-2xl bg-lime text-ink">
                        <VehicleIcon />
                      </span>
                      <Badge className="bg-white/10 text-white">
                        {vehicleDeadlines.length} scadenze
                      </Badge>
                    </div>
                    <CardTitle className="mt-5 font-heading text-3xl font-black">
                      {vehicle}
                    </CardTitle>
                    <p className="text-sm text-white/60">
                      Spese collegate:{' '}
                      <strong className="text-white">
                        {euro.format(vehicleSpend(vehicle))}
                      </strong>
                    </p>
                  </CardHeader>
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-[.15em] text-muted-foreground">
                      Prossime scadenze
                    </h3>
                    <div className="space-y-2">
                      {vehicleDeadlines.map((deadline) => {
                        const days = daysUntil(deadline.date);
                        return (
                          <div
                            key={deadline.id}
                            className="flex items-center gap-3 rounded-2xl bg-muted p-3"
                          >
                            <span
                              className={`grid size-10 place-items-center rounded-xl ${days <= 30 ? 'bg-coral text-white' : 'bg-white text-ink'}`}
                            >
                              <CalendarClock className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <strong className="block">
                                {deadline.label}
                              </strong>
                              <span className="text-xs text-muted-foreground">
                                {shortDate.format(
                                  new Date(`${deadline.date}T00:00:00`),
                                )}
                              </span>
                            </span>
                            <Badge
                              variant={days <= 30 ? 'destructive' : 'secondary'}
                            >
                              {days < 0 ? 'scaduta' : `${days} gg`}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 w-full rounded-2xl"
                      onClick={() => setDeadlineVehicle(vehicle)}
                    >
                      <Settings2 /> Gestisci scadenze
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent
          value="lavoro"
          className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
        >
          <PageHeading
            eyebrow="Busta paga"
            title="Tempo che vale"
            description="Registra le giornate e controlla compenso e buoni pasto maturati."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  icon={Clock3}
                  label="Ore del mese"
                  value={totalHours.toLocaleString('it-IT', {
                    maximumFractionDigits: 2,
                  })}
                  color="bg-teal"
                />
                <SummaryCard
                  icon={Euro}
                  label="Guadagno"
                  value={euro.format(wage)}
                  color="bg-ink"
                />
                <SummaryCard
                  icon={Utensils}
                  label="Buoni pasto"
                  value={`${mealCount} · ${euro.format(benefits)}`}
                  color="bg-coral"
                />
              </div>
              <Card className="rounded-[1.75rem] border-0 shadow-sm ring-1 ring-ink/7">
                <CardHeader className="px-5 pt-5">
                  <CardTitle className="font-heading text-xl font-extrabold">
                    Aggiungi giornata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-4 sm:grid-cols-2"
                    onSubmit={submitWork}
                  >
                    <Field label="Data">
                      <Input
                        required
                        type="date"
                        value={workDraft.date}
                        onChange={(e) =>
                          setWorkDraft({ ...workDraft, date: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Pausa (minuti)">
                      <Input
                        required
                        min="0"
                        type="number"
                        value={workDraft.breakMinutes}
                        onChange={(e) =>
                          setWorkDraft({
                            ...workDraft,
                            breakMinutes: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Ora inizio">
                      <Input
                        required
                        type="time"
                        value={workDraft.start}
                        onChange={(e) =>
                          setWorkDraft({ ...workDraft, start: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Ora fine">
                      <Input
                        required
                        type="time"
                        value={workDraft.end}
                        onChange={(e) =>
                          setWorkDraft({ ...workDraft, end: e.target.value })
                        }
                      />
                    </Field>
                    <Button className="h-11 rounded-2xl bg-teal font-bold text-white hover:bg-teal/90 sm:col-span-2">
                      <Plus /> Registra ore
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card className="rounded-[1.75rem] border-0 shadow-sm ring-1 ring-ink/7">
                <CardHeader className="border-b border-border px-5 py-5">
                  <CardTitle className="font-heading text-xl font-extrabold">
                    Registro giornaliero
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border px-3 pb-2">
                  {workEntries.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-2 py-4"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-muted">
                        <Clock3 className="size-5" />
                      </span>
                      <span className="flex-1">
                        <strong className="block">
                          {shortDate.format(new Date(`${item.date}T00:00:00`))}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          {item.start}–{item.end} · pausa {item.breakMinutes}{' '}
                          min
                        </span>
                      </span>
                      <strong>
                        {hoursFor(item).toLocaleString('it-IT', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        h
                      </strong>
                      <Button
                        aria-label="Elimina giornata"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() =>
                          setWorkEntries((all) =>
                            all.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
            <aside>
              <Card className="sticky top-24 rounded-[1.75rem] border-0 bg-lime shadow-sm ring-0">
                <CardHeader className="px-5 pt-5">
                  <CardTitle className="flex items-center gap-2 font-heading text-xl font-extrabold">
                    <Settings2 className="size-5" /> Impostazioni paga
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Saldo iniziale (€)">
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.openingBalance}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          openingBalance: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Tariffa oraria (€/h)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.hourlyRate}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hourlyRate: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Ore minime per buono">
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={settings.mealMinHours}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mealMinHours: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Valore buono pasto (€)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.mealValue}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mealValue: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="rounded-2xl bg-ink p-4 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                      Totale mese incl. buoni
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {euro.format(wage + benefits)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.75rem] p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">
              Nuovo acquisto
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati principali e, se vuoi, conserva dettagli e foto.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitExpense}>
            <Field label="Nome negozio">
              <Input
                required
                placeholder="Es. Supermercato"
                value={expenseDraft.store}
                onChange={(e) =>
                  setExpenseDraft({ ...expenseDraft, store: e.target.value })
                }
              />
            </Field>
            <Field label="Importo (€)">
              <Input
                required
                inputMode="decimal"
                placeholder="0,00"
                value={expenseDraft.amount}
                onChange={(e) =>
                  setExpenseDraft({ ...expenseDraft, amount: e.target.value })
                }
              />
            </Field>
            <Field label="Categoria">
              <NativeSelect
                className="w-full"
                value={expenseDraft.category}
                onChange={(e) =>
                  setExpenseDraft({ ...expenseDraft, category: e.target.value })
                }
              >
                {CATEGORIES.map((item) => (
                  <NativeSelectOption key={item}>{item}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Data">
              <Input
                required
                type="date"
                value={expenseDraft.date}
                onChange={(e) =>
                  setExpenseDraft({ ...expenseDraft, date: e.target.value })
                }
              />
            </Field>
            {VEHICLE_CATEGORIES.has(expenseDraft.category) && (
              <>
                <Field label="Destinazione">
                  <NativeSelect
                    className="w-full"
                    value={expenseDraft.vehicle}
                    onChange={(e) =>
                      setExpenseDraft({
                        ...expenseDraft,
                        vehicle: e.target.value as Vehicle,
                      })
                    }
                  >
                    <NativeSelectOption>Macchina</NativeSelectOption>
                    <NativeSelectOption>Moto</NativeSelectOption>
                    <NativeSelectOption>Altro</NativeSelectOption>
                  </NativeSelect>
                </Field>
                {expenseDraft.vehicle === 'Altro' && (
                  <Field label="Descrizione mezzo">
                    <Input
                      required
                      placeholder="Es. Furgone aziendale"
                      value={expenseDraft.vehicleNote}
                      onChange={(e) =>
                        setExpenseDraft({
                          ...expenseDraft,
                          vehicleNote: e.target.value,
                        })
                      }
                    />
                  </Field>
                )}
              </>
            )}
            <div className="sm:col-span-2">
              <Field label="Voci dello scontrino (facoltative)">
                <Textarea
                  placeholder="Una voce per riga…"
                  value={expenseDraft.items}
                  onChange={(e) =>
                    setExpenseDraft({ ...expenseDraft, items: e.target.value })
                  }
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-input p-4 text-sm font-semibold transition hover:bg-muted sm:col-span-2">
              <span className="grid size-10 place-items-center rounded-xl bg-muted">
                <ImagePlus className="size-5" />
              </span>
              <span className="flex-1">
                {expenseDraft.receipt
                  ? 'Foto pronta per il salvataggio'
                  : 'Aggiungi foto scontrino'}
              </span>
              <Input
                accept="image/*"
                capture="environment"
                className="sr-only"
                type="file"
                onChange={(e) => void onReceipt(e.target.files?.[0])}
              />
              {expenseDraft.receipt && <Check className="text-teal" />}
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpenseOpen(false)}
              >
                Annulla
              </Button>
              <Button
                className="bg-coral text-white hover:bg-coral/90"
                type="submit"
              >
                Salva spesa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deadlineVehicle)}
        onOpenChange={(open) => !open && setDeadlineVehicle(null)}
      >
        <DialogContent className="rounded-[1.75rem] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black">
              Scadenze {deadlineVehicle}
            </DialogTitle>
            <DialogDescription>
              Le date vengono salvate sul dispositivo e usate per gli avvisi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {deadlineVehicle &&
              ['Assicurazione', 'Bollo', 'Revisione', 'Tagliando'].map(
                (label) => {
                  const current = deadlines.find(
                    (item) =>
                      item.vehicle === deadlineVehicle && item.label === label,
                  );
                  return (
                    <Field key={label} label={label}>
                      <Input
                        type="date"
                        value={current?.date ?? ''}
                        onChange={(e) => {
                          const date = e.target.value;
                          setDeadlines((all) => {
                            const without = all.filter(
                              (item) =>
                                !(
                                  item.vehicle === deadlineVehicle &&
                                  item.label === label
                                ),
                            );
                            return date
                              ? [
                                  ...without,
                                  {
                                    id: current?.id ?? uid('deadline'),
                                    vehicle: deadlineVehicle,
                                    label,
                                    date,
                                  },
                                ]
                              : without;
                          });
                        }}
                      />
                    </Field>
                  );
                },
              )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDeadlineVehicle(null)}>Fatto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.75rem] p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <Settings2 className="size-6 text-teal" /> Personalizza app
            </DialogTitle>
            <DialogDescription>
              Le preferenze vengono salvate su questo dispositivo e applicate
              subito a tutta l’interfaccia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Aspetto">
                <NativeSelect
                  className="w-full"
                  value={appearance.theme}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      theme: event.target.value as Appearance['theme'],
                    })
                  }
                >
                  <NativeSelectOption value="system">
                    Come il dispositivo
                  </NativeSelectOption>
                  <NativeSelectOption value="light">
                    Modalità chiara
                  </NativeSelectOption>
                  <NativeSelectOption value="dark">
                    Modalità scura
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field label="Font dell’app">
                <NativeSelect
                  className="w-full"
                  value={appearance.font}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      font: event.target.value as Appearance['font'],
                    })
                  }
                >
                  <NativeSelectOption value="geist">
                    Geist · moderno
                  </NativeSelectOption>
                  <NativeSelectOption value="system">
                    System · neutro
                  </NativeSelectOption>
                  <NativeSelectOption value="rounded">
                    Trebuchet · morbido
                  </NativeSelectOption>
                  <NativeSelectOption value="editorial">
                    Georgia · editoriale
                  </NativeSelectOption>
                  <NativeSelectOption value="mono">
                    Monospace · tecnico
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold">Colori personalizzati</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Usa il picker oppure imposta direttamente i valori RGB
                  (0–255).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorControl
                  label="Brand"
                  value={appearance.brandColor}
                  onChange={(value) =>
                    setAppearance({ ...appearance, brandColor: value })
                  }
                />
                <ColorControl
                  label="Accento"
                  value={appearance.accentColor}
                  onChange={(value) =>
                    setAppearance({ ...appearance, accentColor: value })
                  }
                />
                <ColorControl
                  label="Evidenza"
                  value={appearance.highlightColor}
                  onChange={(value) =>
                    setAppearance({ ...appearance, highlightColor: value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
              <span className="grid size-9 place-items-center rounded-xl bg-teal text-white">
                <Check className="size-4" />
              </span>
              <span>
                <strong>Anteprima attiva.</strong>{' '}
                <span className="text-muted-foreground">
                  Ogni modifica è visibile appena la selezioni.
                </span>
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAppearanceOpen(false)}>Fatto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-[1.4rem] bg-ink p-2 text-white shadow-2xl lg:hidden"
      >
        {navItems.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`rounded-2xl px-1 py-2 text-[0.68rem] font-bold transition ${section === value ? 'bg-white/10 text-lime' : 'text-white/55'}`}
          >
            <Icon className="mx-auto mb-1 size-4" />
            <span className="block">{label}</span>
          </button>
        ))}
      </nav>
      <Button
        aria-label="Aggiungi una nuova spesa"
        onClick={() => setExpenseOpen(true)}
        className="fixed bottom-20 right-5 z-40 size-14 rounded-full bg-lime text-ink shadow-xl hover:bg-lime/90 sm:hidden"
        size="icon-lg"
      >
        <Plus className="size-6" />
      </Button>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wider text-white/45">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-extrabold">{value}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full grid min-h-32 place-items-center rounded-2xl bg-muted px-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
function ExpenseRow({
  expense,
  expanded = false,
}: {
  expense: Expense;
  expanded?: boolean;
}) {
  const Icon = VEHICLE_CATEGORIES.has(expense.category) ? Fuel : ReceiptText;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-muted text-ink">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate">{expense.store}</strong>
        <span className="block truncate text-xs text-muted-foreground">
          {expense.category}
          {expense.vehicle ? ` · ${expense.vehicle}` : ''} ·{' '}
          {shortDate.format(new Date(`${expense.date}T00:00:00`))}
          {expanded && expense.items
            ? ` · ${expense.items.replace(/\n/g, ', ')}`
            : ''}
        </span>
      </span>
      {expense.receipt && <ImagePlus className="size-4 shrink-0 text-teal" />}
      <strong className="shrink-0 text-ink">
        {euro.format(expense.amount)}
      </strong>
    </div>
  );
}
function QuickCard({
  color,
  icon: Icon,
  title,
  text,
  onClick,
}: {
  color: string;
  icon: typeof CarFront;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`${color} rounded-[1.5rem] p-4 text-left text-white transition hover:-translate-y-0.5`}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-6" />
      <span className="mt-6 block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs text-white/70">{text}</span>
    </button>
  );
}
function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="rounded-[1.5rem] border-0 py-4 shadow-sm ring-1 ring-ink/7">
      <CardContent className="flex items-center gap-3 px-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color} text-white`}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-muted-foreground">
            {label}
          </span>
          <strong className="block truncate text-lg">{value}</strong>
        </span>
      </CardContent>
    </Card>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rgb = hexToRgb(value);
  const updateChannel = (channel: 'r' | 'g' | 'b', channelValue: string) => {
    onChange(
      rgbToHex(
        channel === 'r' ? Number(channelValue) : rgb.r,
        channel === 'g' ? Number(channelValue) : rgb.g,
        channel === 'b' ? Number(channelValue) : rgb.b,
      ),
    );
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <input
          aria-label={`Scegli colore ${label}`}
          className="size-9 cursor-pointer rounded-xl border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <code className="mt-2 block text-xs font-semibold uppercase text-muted-foreground">
        {value}
      </code>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label
            key={channel}
            className="flex items-center gap-1 rounded-lg bg-muted px-1.5"
          >
            <span className="text-[0.65rem] font-black uppercase text-muted-foreground">
              {channel}
            </span>
            <Input
              aria-label={`${label} ${channel.toUpperCase()}`}
              className="h-7 border-0 bg-transparent px-0 text-center text-xs shadow-none"
              inputMode="numeric"
              max="255"
              min="0"
              type="number"
              value={rgb[channel]}
              onChange={(event) => updateChannel(channel, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-teal">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-heading text-4xl font-black tracking-[-.05em] sm:text-5xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
