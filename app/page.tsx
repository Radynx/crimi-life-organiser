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
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
  UserRound,
  WalletCards,
} from 'lucide-react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
import { Switch } from '@/components/ui/switch';
import { firebaseAuth, firebaseConfigured, firebaseDb } from '@/lib/firebase';

type Section = 'dashboard' | 'spese' | 'mezzi' | 'lavoro';
type Vehicle = 'Macchina' | 'Moto' | 'Altro';
type Expense = {
  id: string;
  store: string;
  category: string;
  amount: number;
  date: string;
  vehicle?: Vehicle;
  vehicleId?: string;
  vehicleNote?: string;
  items?: string;
  receipt?: string;
};
type MileageUpdate = {
  id: string;
  date: string;
  km: number;
  note?: string;
};
type VehicleRecord = {
  id: string;
  name: string;
  type: Vehicle;
  brand: string;
  model: string;
  plate: string;
  serial: string;
  fuel: string;
  mileage: number;
  mileageUpdatedAt: string;
  mileageUpdates: MileageUpdate[];
  insuranceType: string;
  insuranceProvider: string;
  insuranceCoverage: string;
  insuranceExpiry: string;
  notes: string;
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
  vehicle: string;
  vehicleId?: string;
  label: string;
  date: string;
};
type Settings = {
  openingBalance: number;
  hourlyRate: number;
  mealMinHours: number;
  mealValue: number;
  company: Company;
  enabledSections: Record<Section, boolean>;
};
type Company = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  vatNumber: string;
  phone: string;
  email: string;
  notes: string;
};
type Appearance = {
  theme: 'system' | 'light' | 'dark';
  font: keyof typeof FONT_STACKS;
  textScale: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  radius: 'soft' | 'rounded' | 'sharp';
  highContrast: boolean;
  reduceMotion: boolean;
  brandColor: string;
  accentColor: string;
  highlightColor: string;
};
type Profile = {
  username: string;
  birthDate: string;
  homeAddress: string;
  additionalAddresses: string[];
};
type SavedTheme = Appearance & {
  id: string;
  name: string;
};
type BankAccount = {
  id: string;
  name: string;
  balance: number;
  iban: string;
  notes: string;
};
type AccountData = {
  expenses: Expense[];
  workEntries: WorkEntry[];
  deadlines: Deadline[];
  vehicles: VehicleRecord[];
  bankAccounts: BankAccount[];
  settings: Settings;
  profile: Profile;
  appearance: Appearance;
  savedThemes: SavedTheme[];
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
const SECTION_OPTIONS: {
  value: Section;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    value: 'dashboard',
    label: 'Dashboard',
    description: 'Saldo, grafici e consigli smart.',
    icon: LayoutDashboard,
  },
  {
    value: 'spese',
    label: 'Spese',
    description: 'Registro acquisti e scontrini.',
    icon: ReceiptText,
  },
  {
    value: 'mezzi',
    label: 'Mezzi',
    description: 'Veicoli, km, assicurazioni e scadenze.',
    icon: CarFront,
  },
  {
    value: 'lavoro',
    label: 'Lavoro',
    description: 'Ore lavorate, paga e buoni pasto.',
    icon: Clock3,
  },
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
    vehicleId: 'vehicle-car',
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
    vehicleId: 'vehicle-moto',
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

const initialVehicles: VehicleRecord[] = [
  {
    id: 'vehicle-car',
    name: 'Macchina',
    type: 'Macchina',
    brand: '',
    model: '',
    plate: '',
    serial: '',
    fuel: 'Benzina',
    mileage: 0,
    mileageUpdatedAt: '',
    mileageUpdates: [],
    insuranceType: '',
    insuranceProvider: '',
    insuranceCoverage: '',
    insuranceExpiry: '',
    notes: '',
  },
  {
    id: 'vehicle-moto',
    name: 'Moto',
    type: 'Moto',
    brand: '',
    model: '',
    plate: '',
    serial: '',
    fuel: 'Benzina',
    mileage: 0,
    mileageUpdatedAt: '',
    mileageUpdates: [],
    insuranceType: '',
    insuranceProvider: '',
    insuranceCoverage: '',
    insuranceExpiry: '',
    notes: '',
  },
];

const initialDeadlines: Deadline[] = [
  {
    id: 'd1',
    vehicle: 'Macchina',
    vehicleId: 'vehicle-car',
    label: 'Assicurazione',
    date: '2026-09-24',
  },
  {
    id: 'd2',
    vehicle: 'Macchina',
    vehicleId: 'vehicle-car',
    label: 'Revisione',
    date: '2027-02-18',
  },
  {
    id: 'd3',
    vehicle: 'Moto',
    vehicleId: 'vehicle-moto',
    label: 'Bollo',
    date: '2026-10-10',
  },
  {
    id: 'd4',
    vehicle: 'Moto',
    vehicleId: 'vehicle-moto',
    label: 'Tagliando',
    date: '2026-11-04',
  },
];

const initialSettings: Settings = {
  openingBalance: 3200,
  hourlyRate: 12.5,
  mealMinHours: 6,
  mealValue: 7,
  company: {
    name: '',
    address: '',
    city: '',
    postalCode: '',
    vatNumber: '',
    phone: '',
    email: '',
    notes: '',
  },
  enabledSections: {
    dashboard: true,
    spese: true,
    mezzi: true,
    lavoro: true,
  },
};
const initialCompany = initialSettings.company;
const initialEnabledSections = initialSettings.enabledSections;

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
  textScale: 'medium',
  density: 'comfortable',
  radius: 'rounded',
  highContrast: false,
  reduceMotion: false,
  brandColor: '#0f3d5e',
  accentColor: '#21a179',
  highlightColor: '#f97360',
};

const initialProfile: Profile = {
  username: '',
  birthDate: '',
  homeAddress: '',
  additionalAddresses: [],
};
const initialBankAccounts: BankAccount[] = [
  {
    id: 'bank-main',
    name: 'Conto principale',
    balance: initialSettings.openingBalance,
    iban: '',
    notes: '',
  },
];

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

function authErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use':
      'Questa email è già registrata. Prova ad accedere.',
    'auth/invalid-credential': 'Email o password non corrette.',
    'auth/invalid-email': 'Inserisci un indirizzo email valido.',
    'auth/operation-not-allowed':
      'Il metodo Email/Password non è ancora attivo nel progetto Firebase.',
    'auth/too-many-requests':
      'Troppi tentativi ravvicinati. Riprova tra qualche minuto.',
    'auth/user-disabled': 'Questo account è stato disabilitato.',
    'auth/user-not-found': 'Non esiste ancora un account con questa email.',
    'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
    'auth/network-request-failed':
      'Connessione non disponibile. Controlla la rete e riprova.',
  };
  return (
    messages[code] ?? 'Non è stato possibile completare l’operazione. Riprova.'
  );
}

function mergeSettings(raw?: Partial<Settings>): Settings {
  return {
    ...initialSettings,
    ...raw,
    company: { ...initialCompany, ...raw?.company },
    enabledSections: {
      ...initialEnabledSections,
      ...raw?.enabledSections,
    },
  };
}

function parseAccountData(raw: unknown): Partial<AccountData> {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as Record<string, unknown>;
  const data: Partial<AccountData> = {};
  if (Array.isArray(value.expenses))
    data.expenses = value.expenses as Expense[];
  if (Array.isArray(value.workEntries))
    data.workEntries = value.workEntries as WorkEntry[];
  if (Array.isArray(value.deadlines))
    data.deadlines = value.deadlines as Deadline[];
  if (Array.isArray(value.vehicles))
    data.vehicles = value.vehicles as VehicleRecord[];
  if (Array.isArray(value.bankAccounts))
    data.bankAccounts = value.bankAccounts.map((account) => {
      const item = account as Partial<BankAccount>;
      return {
        id: String(item.id ?? uid('bank')),
        name: String(item.name ?? ''),
        balance: Number(item.balance) || 0,
        iban: String(item.iban ?? ''),
        notes: String(item.notes ?? ''),
      };
    });
  if (value.settings && typeof value.settings === 'object')
    data.settings = value.settings as Settings;
  if (value.profile && typeof value.profile === 'object') {
    const profile = value.profile as Record<string, unknown>;
    data.profile = {
      ...initialProfile,
      ...profile,
      additionalAddresses: Array.isArray(profile.additionalAddresses)
        ? profile.additionalAddresses.filter(
            (address): address is string => typeof address === 'string',
          )
        : [],
    };
  }
  if (value.appearance && typeof value.appearance === 'object')
    data.appearance = value.appearance as Appearance;
  if (Array.isArray(value.savedThemes))
    data.savedThemes = value.savedThemes as SavedTheme[];
  return data;
}

function readStoredAccountData(key: string) {
  try {
    const value = localStorage.getItem(key);
    return value ? parseAccountData(JSON.parse(value)) : null;
  } catch {
    return null;
  }
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
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(initialVehicles);
  const [bankAccounts, setBankAccounts] =
    useState<BankAccount[]>(initialBankAccounts);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [savedThemeName, setSavedThemeName] = useState('');
  const [selectedSavedThemeId, setSelectedSavedThemeId] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankDraft, setBankDraft] = useState({
    name: '',
    balance: '',
    iban: '',
    notes: '',
  });
  const [notificationHelpOpen, setNotificationHelpOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    'account' | 'personalizza' | 'temi' | 'sezioni'
  >('personalizza');
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>(
    'login',
  );
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [deadlineVehicle, setDeadlineVehicle] = useState<
    VehicleRecord | null
  >(null);
  const [notice, setNotice] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({
    store: '',
    category: 'Spesa',
    amount: '',
    date: '2026-09-03',
    vehicle: 'Macchina' as Vehicle,
    vehicleId: 'vehicle-car',
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
  const [vehicleDraft, setVehicleDraft] = useState({
    name: '',
    type: 'Macchina' as Vehicle,
    brand: '',
    model: '',
    plate: '',
    serial: '',
    fuel: 'Benzina',
    mileage: '',
    mileageDate: new Date().toISOString().slice(0, 10),
    mileageNote: '',
    insuranceType: '',
    insuranceProvider: '',
    insuranceCoverage: '',
    insuranceExpiry: '',
    notes: '',
  });

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return undefined;
    }
    void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      /* Firebase usa comunque la persistenza locale predefinita del browser. */
    });
    return onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
      setAuthError('');
      if (user) setAccountLoading(true);
      if (!user) {
        setAccountLoading(false);
        setAccountError('');
        setHydrated(false);
        setExpenses(initialExpenses);
        setWorkEntries(initialWork);
        setDeadlines(initialDeadlines);
        setVehicles(initialVehicles);
        setBankAccounts(initialBankAccounts);
        setSettings(initialSettings);
        setProfile(initialProfile);
        setAppearance(initialAppearance);
        setSavedThemes([]);
        setSelectedSavedThemeId('');
      }
    });
  }, []);

  useEffect(() => {
    if (!authUser) return undefined;
    let active = true;
    const accountKey = `${STORAGE_KEY}:${authUser.uid}`;
    const accountRef = firebaseDb
      ? doc(firebaseDb, 'users', authUser.uid, 'organiser', 'state')
      : null;
    const applyData = (data: Partial<AccountData>) => {
      if (data.expenses) setExpenses(data.expenses);
      if (data.workEntries) setWorkEntries(data.workEntries);
      if (data.deadlines) setDeadlines(data.deadlines);
      if (data.vehicles)
        setVehicles(
          data.vehicles.map((vehicle) => ({
            ...(initialVehicles.find((item) => item.id === vehicle.id) ??
              initialVehicles[0]),
            ...vehicle,
            mileageUpdates: Array.isArray(vehicle.mileageUpdates)
              ? vehicle.mileageUpdates
              : [],
          })),
        );
      if (data.bankAccounts?.length) setBankAccounts(data.bankAccounts);
      else if (
        data.settings?.openingBalance !== undefined &&
        Number(data.settings.openingBalance) !== 0
      )
        setBankAccounts([
          {
            ...initialBankAccounts[0],
            balance: Number(data.settings.openingBalance) || 0,
          },
        ]);
      else if (data.bankAccounts) setBankAccounts(data.bankAccounts);
      if (data.settings) setSettings(mergeSettings(data.settings));
      if (data.profile)
        setProfile({
          ...initialProfile,
          ...data.profile,
          additionalAddresses: data.profile.additionalAddresses ?? [],
        });
      if (data.appearance) {
        const mergedAppearance = { ...initialAppearance, ...data.appearance };
        const hasLegacyDefaults =
          data.appearance.brandColor?.toLowerCase() === '#142f2a' &&
          data.appearance.accentColor?.toLowerCase() === '#d7df23' &&
          data.appearance.highlightColor?.toLowerCase() === '#ff6b4a';
        setAppearance(
          hasLegacyDefaults
            ? {
                ...mergedAppearance,
                brandColor: initialAppearance.brandColor,
                accentColor: initialAppearance.accentColor,
                highlightColor: initialAppearance.highlightColor,
              }
            : mergedAppearance,
        );
      }
      if (data.savedThemes) setSavedThemes(data.savedThemes);
    };
    const cachedData = readStoredAccountData(accountKey);
    if (cachedData) applyData(cachedData);

    const loadAccount = async () => {
      setAccountLoading(true);
      setAccountError('');
      setHydrated(false);
      try {
        if (!firebaseDb || !accountRef) {
          if (active) setAccountError('Archivio account non disponibile.');
          return;
        }
        const snapshot = await getDoc(accountRef);
        if (snapshot.exists()) {
          if (active) applyData(parseAccountData(snapshot.data()));
          return;
        }

        let firstAccountData = cachedData;
        const migrationKey = `${STORAGE_KEY}:migrated-users`;
        let migrationUsers: string[] = [];
        try {
          const migrationData = JSON.parse(
            localStorage.getItem(migrationKey) ?? '{}',
          ) as { users?: unknown };
          if (Array.isArray(migrationData.users))
            migrationUsers = migrationData.users.filter(
              (value): value is string => typeof value === 'string',
            );
        } catch {
          migrationUsers = [];
        }
        if (!firstAccountData && migrationUsers.length === 0) {
          firstAccountData = readStoredAccountData(STORAGE_KEY);
        }
        if (active && firstAccountData) applyData(firstAccountData);
        const initialData: AccountData = {
          expenses: firstAccountData?.expenses ?? initialExpenses,
          workEntries: firstAccountData?.workEntries ?? initialWork,
          deadlines: firstAccountData?.deadlines ?? initialDeadlines,
          vehicles: firstAccountData?.vehicles ?? initialVehicles,
          bankAccounts:
            (firstAccountData?.bankAccounts?.length
              ? firstAccountData.bankAccounts
              : firstAccountData?.settings?.openingBalance !== undefined &&
                  Number(firstAccountData.settings.openingBalance) !== 0
              ? [
                  {
                    ...initialBankAccounts[0],
                    balance: Number(firstAccountData.settings.openingBalance) || 0,
                  },
                ]
              : firstAccountData?.bankAccounts ?? initialBankAccounts),
          settings: mergeSettings(firstAccountData?.settings),
          profile: { ...initialProfile, ...firstAccountData?.profile },
          appearance: { ...initialAppearance, ...firstAccountData?.appearance },
          savedThemes: firstAccountData?.savedThemes ?? [],
        };
        await setDoc(
          accountRef,
          JSON.parse(JSON.stringify(initialData)),
          { merge: true },
        );
        if (migrationUsers.length === 0) {
          localStorage.setItem(
            migrationKey,
            JSON.stringify({ users: [authUser.uid] }),
          );
        }
      } catch {
        if (active) {
          setAccountError(
            'Cloud Firestore non raggiungibile: uso la copia locale di questo account.',
          );
        }
      } finally {
        if (active) {
          setHydrated(true);
          setAccountLoading(false);
        }
      }
    };
    void loadAccount();
    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!hydrated || !authUser) return undefined;
    const accountData: AccountData = {
      expenses,
      workEntries,
      deadlines,
      vehicles,
      bankAccounts,
      settings,
      profile,
      appearance,
      savedThemes,
    };
    const serialized = JSON.stringify(accountData);
    try {
      localStorage.setItem(`${STORAGE_KEY}:${authUser.uid}`, serialized);
    } catch {
      setNotice('Spazio locale esaurito: rimuovi alcune foto degli scontrini.');
    }
    if (!firebaseDb) return undefined;
    const db = firebaseDb;
    const timer = window.setTimeout(() => {
      void setDoc(
        doc(db, 'users', authUser.uid, 'organiser', 'state'),
        JSON.parse(serialized),
      ).catch(() => {
        setAccountError(
          'Salvataggio cloud non riuscito: controlla le regole Firestore.',
        );
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    appearance,
    authUser,
    bankAccounts,
    deadlines,
    expenses,
    hydrated,
    profile,
    savedThemes,
    settings,
    vehicles,
    workEntries,
  ]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyAppearance = () => {
      const dark =
        appearance.theme === 'dark' ||
        (appearance.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
      root.classList.toggle('high-contrast', appearance.highContrast);
      root.classList.toggle('reduce-motion', appearance.reduceMotion);
      root.dataset.density = appearance.density;
      root.dataset.radiusStyle = appearance.radius;
      root.style.setProperty('--font-app', FONT_STACKS[appearance.font]);
      root.style.setProperty(
        '--font-scale',
        appearance.textScale === 'small'
          ? '0.9375'
          : appearance.textScale === 'large'
            ? '1.125'
            : '1',
      );
      root.style.setProperty(
        '--density-scale',
        appearance.density === 'compact'
          ? '0.88'
          : appearance.density === 'spacious'
            ? '1.12'
            : '1',
      );
      root.style.setProperty(
        '--app-line-height',
        appearance.density === 'compact'
          ? '1.3'
          : appearance.density === 'spacious'
            ? '1.65'
            : '1.45',
      );
      root.style.setProperty(
        '--radius',
        appearance.radius === 'soft'
          ? '1.15rem'
          : appearance.radius === 'sharp'
            ? '0.35rem'
            : '0.85rem',
      );
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

  useEffect(() => {
    if (
      !authUser ||
      !('Notification' in window) ||
      Notification.permission !== 'denied'
    )
      return;
    const reminderAt = Number(
      localStorage.getItem('crimi-notification-reminder') ?? 0,
    );
    if (reminderAt && Date.now() >= reminderAt) {
      localStorage.removeItem('crimi-notification-reminder');
      setNotificationHelpOpen(true);
    }
  }, [authUser]);

  useEffect(() => {
    if (!firebaseAuth) return undefined;
    return onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUser(user);
      if (user) {
        setAuthOpen(false);
        setAuthPassword('');
      }
    });
  }, []);

  useEffect(() => {
    if (settings.enabledSections[section]) return;
    const fallback = SECTION_OPTIONS.find(
      ({ value }) => settings.enabledSections[value],
    );
    if (fallback) setSection(fallback.value);
  }, [section, settings.enabledSections]);

  const month = currentMonthKey();
  const monthName = useMemo(
    () =>
      new Intl.DateTimeFormat('it-IT', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${month}-01T00:00:00`)),
    [month],
  );
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
  const bankTotal = useMemo(
    () => bankAccounts.reduce((sum, account) => sum + account.balance, 0),
    [bankAccounts],
  );
  const availableBalance = bankTotal;

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
                vehicleId: { type: 'string' },
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
                vehicleId: value.vehicleId,
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
    if (Notification.permission === 'denied') {
      setNotificationHelpOpen(true);
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
    } else setNotificationHelpOpen(true);
  }

  function openNewBank() {
    setEditingBankId(null);
    setBankDraft({ name: '', balance: '', iban: '', notes: '' });
    setBankOpen(true);
  }

  function openEditBank(account: BankAccount) {
    setEditingBankId(account.id);
    setBankDraft({
      name: account.name,
      balance: String(account.balance),
      iban: account.iban,
      notes: account.notes,
    });
    setBankOpen(true);
  }

  function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = bankDraft.name.trim();
    const balance = Number(bankDraft.balance.replace(',', '.'));
    if (!name || !Number.isFinite(balance)) {
      setNotice('Inserisci nome banca e saldo validi.');
      return;
    }
    const account: BankAccount = {
      id: editingBankId ?? uid('bank'),
      name,
      balance,
      iban: bankDraft.iban.trim(),
      notes: bankDraft.notes.trim(),
    };
    if (!editingBankId && bankAccounts.length === 0)
      setSettings((current) => ({ ...current, openingBalance: 0 }));
    setBankAccounts((current) =>
      editingBankId
        ? current.map((item) => (item.id === editingBankId ? account : item))
        : [account, ...current],
    );
    setBankOpen(false);
    setEditingBankId(null);
    setNotice(editingBankId ? 'Conto bancario aggiornato.' : 'Conto bancario aggiunto.');
  }

  function deleteBank(account: BankAccount) {
    if (!window.confirm(`Rimuovere il conto “${account.name}”?`)) return;
    setBankAccounts((current) => current.filter((item) => item.id !== account.id));
    if (bankAccounts.length <= 1)
      setSettings((current) => ({ ...current, openingBalance: 0 }));
    setNotice(`Conto “${account.name}” rimosso.`);
  }

  function postponeNotifications() {
    try {
      localStorage.setItem(
        'crimi-notification-reminder',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );
    } catch {
      /* La notifica viene comunque rimandata per questa sessione. */
    }
    setNotificationHelpOpen(false);
    setNotice('Ti ricorderemo di attivare le notifiche tra 7 giorni.');
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
      vehicleId: needsVehicle ? expenseDraft.vehicleId || undefined : undefined,
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
      vehicleId: 'vehicle-car',
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

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    if (!firebaseAuth || !firebaseConfigured) {
      setAuthError(
        'Configura Firebase con le variabili VITE_FIREBASE_* per attivare l’accesso.',
      );
      return;
    }
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Inserisci il tuo indirizzo email.');
      return;
    }
    if (authMode !== 'reset' && authPassword.length < 6) {
      setAuthError('La password deve contenere almeno 6 caratteri.');
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === 'reset') {
        await sendPasswordResetEmail(firebaseAuth, email);
        setAuthMode('login');
        setAuthPassword('');
        setNotice('Email di reset inviata. Controlla la tua casella di posta.');
      } else if (authMode === 'signup') {
        await createUserWithEmailAndPassword(firebaseAuth, email, authPassword);
        setNotice('Account creato: accesso effettuato.');
        setAuthOpen(false);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, authPassword);
        setNotice('Accesso effettuato.');
        setAuthOpen(false);
      }
      setAuthPassword('');
    } catch (error) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendAccountPasswordReset() {
    const email = authUser?.email?.trim();
    if (!firebaseAuth || !email) {
      setNotice('Non è disponibile un indirizzo email per il reset.');
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setNotice('Email di reset inviata. Controlla la tua casella di posta.');
    } catch (error) {
      setNotice(authErrorMessage(error));
    }
  }

  function updateProfile(
    field: keyof Profile,
    value: Profile[keyof Profile],
  ) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function addAddress() {
    setProfile((current) => ({
      ...current,
      additionalAddresses: [...current.additionalAddresses, ''],
    }));
  }

  function updateAddress(index: number, value: string) {
    setProfile((current) => ({
      ...current,
      additionalAddresses: current.additionalAddresses.map((address, item) =>
        item === index ? value : address,
      ),
    }));
  }

  function removeAddress(index: number) {
    setProfile((current) => ({
      ...current,
      additionalAddresses: current.additionalAddresses.filter(
        (_, item) => item !== index,
      ),
    }));
  }

  function saveProfile() {
    const cleaned: Profile = {
      ...profile,
      username: profile.username.trim(),
      homeAddress: profile.homeAddress.trim(),
      additionalAddresses: profile.additionalAddresses
        .map((address) => address.trim())
        .filter(Boolean),
    };
    setProfile(cleaned);
    setAppearanceOpen(false);
    setNotice('Profilo account aggiornato.');
  }

  function toggleSection(sectionName: Section, enabled: boolean) {
    const currentlyEnabled = Object.values(settings.enabledSections).filter(
      Boolean,
    ).length;
    if (!enabled && currentlyEnabled <= 1) {
      setNotice('Mantieni almeno una sezione attiva.');
      return;
    }
    const enabledSections = {
      ...settings.enabledSections,
      [sectionName]: enabled,
    };
    setSettings({ ...settings, enabledSections });
    if (!enabled && section === sectionName) {
      const fallback = (Object.keys(enabledSections) as Section[]).find(
        (value) => enabledSections[value],
      );
      if (fallback) setSection(fallback);
    }
  }

  function updateCompany(field: keyof Company, value: string) {
    setSettings((current) => ({
      ...current,
      company: { ...current.company, [field]: value },
    }));
  }

  function openNewVehicle() {
    setEditingVehicleId(null);
    setVehicleDraft({
      name: '',
      type: 'Macchina',
      brand: '',
      model: '',
      plate: '',
      serial: '',
      fuel: 'Benzina',
      mileage: '',
      mileageDate: new Date().toISOString().slice(0, 10),
      mileageNote: '',
      insuranceType: '',
      insuranceProvider: '',
      insuranceCoverage: '',
      insuranceExpiry: '',
      notes: '',
    });
    setVehicleOpen(true);
  }

  function openEditVehicle(vehicle: VehicleRecord) {
    setEditingVehicleId(vehicle.id);
    setVehicleDraft({
      name: vehicle.name,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      plate: vehicle.plate,
      serial: vehicle.serial,
      fuel: vehicle.fuel,
      mileage: vehicle.mileage ? String(vehicle.mileage) : '',
      mileageDate:
        vehicle.mileageUpdatedAt || new Date().toISOString().slice(0, 10),
      mileageNote: '',
      insuranceType: vehicle.insuranceType,
      insuranceProvider: vehicle.insuranceProvider,
      insuranceCoverage: vehicle.insuranceCoverage,
      insuranceExpiry: vehicle.insuranceExpiry,
      notes: vehicle.notes,
    });
    setVehicleOpen(true);
  }

  function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = vehicleDraft.name.trim();
    if (!name) {
      setNotice('Inserisci un nome per il mezzo.');
      return;
    }
    const mileage = Math.max(0, Number(vehicleDraft.mileage) || 0);
    const existing = editingVehicleId
      ? vehicles.find((vehicle) => vehicle.id === editingVehicleId)
      : undefined;
    const mileageChanged =
      existing && mileage !== existing.mileage && vehicleDraft.mileage !== '';
    const mileageUpdate: MileageUpdate | null =
      vehicleDraft.mileage !== '' &&
      (!existing || mileageChanged || existing.mileageUpdates.length === 0)
        ? {
            id: uid('km'),
            date: vehicleDraft.mileageDate,
            km: mileage,
            note: vehicleDraft.mileageNote.trim() || undefined,
          }
        : null;
    const nextVehicle: VehicleRecord = {
      id: existing?.id ?? uid('vehicle'),
      name,
      type: vehicleDraft.type,
      brand: vehicleDraft.brand.trim(),
      model: vehicleDraft.model.trim(),
      plate: vehicleDraft.plate.trim().toUpperCase(),
      serial: vehicleDraft.serial.trim(),
      fuel: vehicleDraft.fuel.trim(),
      mileage,
      mileageUpdatedAt:
        vehicleDraft.mileage !== ''
          ? vehicleDraft.mileageDate
          : existing?.mileageUpdatedAt ?? '',
      mileageUpdates: mileageUpdate
        ? [mileageUpdate, ...(existing?.mileageUpdates ?? [])]
        : (existing?.mileageUpdates ?? []),
      insuranceType: vehicleDraft.insuranceType.trim(),
      insuranceProvider: vehicleDraft.insuranceProvider.trim(),
      insuranceCoverage: vehicleDraft.insuranceCoverage.trim(),
      insuranceExpiry: vehicleDraft.insuranceExpiry,
      notes: vehicleDraft.notes.trim(),
    };
    setVehicles((current) =>
      existing
        ? current.map((vehicle) =>
            vehicle.id === existing.id ? nextVehicle : vehicle,
          )
        : [nextVehicle, ...current],
    );
    if (nextVehicle.insuranceExpiry) {
      setDeadlines((current) => {
        const withoutInsurance = current.filter(
          (item) =>
            !(
              item.vehicleId === nextVehicle.id &&
              item.label === 'Assicurazione'
            ),
        );
        return [
          ...withoutInsurance,
          {
            id: uid('deadline'),
            vehicle: nextVehicle.name,
            vehicleId: nextVehicle.id,
            label: 'Assicurazione',
            date: nextVehicle.insuranceExpiry,
          },
        ];
      });
    } else if (existing) {
      setDeadlines((current) =>
        current.filter(
          (item) =>
            !(
              item.vehicleId === nextVehicle.id &&
              item.label === 'Assicurazione'
            ),
        ),
      );
    }
    setVehicleOpen(false);
    setEditingVehicleId(null);
    setNotice(existing ? 'Mezzo aggiornato.' : 'Mezzo aggiunto.');
  }

  function deleteVehicle(vehicle: VehicleRecord) {
    if (
      !window.confirm(
        `Eliminare “${vehicle.name}”? Le spese già registrate resteranno nel registro.`,
      )
    )
      return;
    setVehicles((current) =>
      current.filter((item) => item.id !== vehicle.id),
    );
    setDeadlines((current) =>
      current.filter((item) => item.vehicleId !== vehicle.id),
    );
    setNotice(`Mezzo “${vehicle.name}” eliminato.`);
  }

  function saveTheme() {
    const name = savedThemeName.trim();
    if (!name) {
      setNotice('Dai un nome al tema prima di salvarlo.');
      return;
    }
    const id = uid('theme');
    setSavedThemes((current) => [{ id, name, ...appearance }, ...current]);
    setSelectedSavedThemeId(id);
    setSavedThemeName('');
    setNotice(`Tema “${name}” salvato.`);
  }

  function applySavedTheme(id: string) {
    setSelectedSavedThemeId(id);
    const saved = savedThemes.find((theme) => theme.id === id);
    if (!saved) return;
    setAppearance({
      ...initialAppearance,
      ...saved,
    });
    setNotice(`Tema “${saved.name}” applicato.`);
  }

  function deleteSelectedTheme() {
    if (!selectedSavedThemeId) return;
    const deleted = savedThemes.find(
      (theme) => theme.id === selectedSavedThemeId,
    );
    setSavedThemes((current) =>
      current.filter((theme) => theme.id !== selectedSavedThemeId),
    );
    setSelectedSavedThemeId('');
    if (deleted) setNotice(`Tema “${deleted.name}” eliminato.`);
  }

  const vehicleSpend = (vehicle: VehicleRecord) =>
    expenses
      .filter(
        (item) =>
          item.vehicleId === vehicle.id ||
          (!item.vehicleId && item.vehicle === vehicle.name),
      )
      .reduce((sum, item) => sum + item.amount, 0);
  const allNavItems: {
    value: Section;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'spese', label: 'Spese', icon: ReceiptText },
    { value: 'mezzi', label: 'Mezzi', icon: CarFront },
    { value: 'lavoro', label: 'Lavoro', icon: Clock3 },
  ];
  const navItems = allNavItems.filter(
    ({ value }) => settings.enabledSections[value],
  );
  const authTitle =
    authMode === 'signup'
      ? 'Crea il tuo account'
      : authMode === 'reset'
        ? 'Reimposta password'
        : 'Accedi a Crimi';
  const authSubmitLabel =
    authMode === 'signup'
      ? 'Crea account'
      : authMode === 'reset'
        ? 'Invia email di reset'
        : 'Accedi';

  if (authLoading || (authUser && accountLoading)) {
    return <AccountLoadingScreen />;
  }
  if (!authUser) return <AuthGate />;

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
            {authUser ? (
              <div className="relative">
                <Button
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Apri menu account"
                  className="h-10 max-w-52 rounded-2xl px-3 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  type="button"
                  variant="ghost"
                >
                  <UserRound className="size-4 shrink-0 text-lime" />
                  <span className="hidden truncate text-xs font-semibold text-white/80 md:block">
                    {profile.username || authUser.email}
                  </span>
                </Button>
                {accountMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-60 rounded-2xl bg-card p-2 text-foreground shadow-2xl ring-1 ring-ink/10"
                    role="menu"
                  >
                    <p className="truncate px-3 py-2 text-xs font-bold text-muted-foreground">
                      {profile.username || 'Il mio account'}
                    </p>
                    <div className="my-1 h-px bg-border" />
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-muted"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setSettingsTab('account');
                        setAppearanceOpen(true);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Settings2 className="size-4" /> Impostazioni account
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/10"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        if (firebaseAuth) void signOut(firebaseAuth);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <LogOut className="size-4" /> Esci
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                aria-label="Accedi o crea un account"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthOpen(true);
                }}
                variant="ghost"
                className="h-10 rounded-2xl px-3 text-white hover:bg-white/10 hover:text-white"
              >
                <LogIn />
                <span className="hidden sm:inline">Accedi</span>
              </Button>
            )}
            <Button
              aria-label="Apri impostazioni"
              onClick={() => {
                setSettingsTab('personalizza');
                setAppearanceOpen(true);
              }}
              variant="ghost"
              className="h-10 rounded-2xl px-3 text-white hover:bg-white/10 hover:text-white"
            >
              <Settings2 />
              <span className="hidden sm:inline">Impostazioni</span>
            </Button>
            {settings.enabledSections.spese && (
              <Button
                onClick={() => setExpenseOpen(true)}
                className="hidden h-10 rounded-2xl bg-lime px-4 font-bold text-ink hover:bg-lime/85 sm:inline-flex"
              >
                <Plus /> Nuova spesa
              </Button>
            )}
          </div>
        </div>
      </header>

      {accountError && (
        <div className="mx-auto mt-4 flex w-[min(92vw,1120px)] items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <LockKeyhole className="size-4 shrink-0" />
          <span>{accountError}</span>
        </div>
      )}

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
                  </div>
                  <WalletCards className="size-7 text-white/60" />
                </div>
                <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-md">
                  <Metric label="Conti bancari" value={euro.format(bankTotal)} />
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
                        {
                          name: 'Entrate teoriche',
                          value: wage,
                          fill: appearance.brandColor,
                        },
                        {
                          name: 'Uscite',
                          value: monthExpenseTotal,
                          fill: appearance.highlightColor,
                        },
                      ]}
                      barSize={46}
                      margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--border)"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        formatter={(value) => [
                          euro.format(Number(value)),
                          'Totale',
                        ]}
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--popover)',
                          color: 'var(--popover-foreground)',
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
            <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
              <CardHeader className="flex-row items-center justify-between px-5 pt-5">
                <div>
                  <CardTitle className="font-heading text-xl font-extrabold tracking-tight">
                    I miei conti
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Il saldo disponibile segue il totale dei conti.
                  </p>
                </div>
                <Button
                  className="rounded-xl text-teal hover:bg-teal/10 hover:text-teal"
                  onClick={openNewBank}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Plus /> Aggiungi
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-4">
                {bankAccounts.length ? (
                  <>
                    {bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal/12 text-teal">
                          <WalletCards className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">
                            {account.name}
                          </strong>
                          <span className="block truncate text-xs text-muted-foreground">
                            {account.iban || 'Conto personale'}
                          </span>
                        </span>
                        <span className="text-sm font-extrabold">
                          {euro.format(account.balance)}
                        </span>
                        <Button
                          aria-label={`Modifica ${account.name}`}
                          className="shrink-0"
                          onClick={() => openEditBank(account)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          aria-label={`Elimina ${account.name}`}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteBank(account)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                      <span className="font-semibold text-muted-foreground">
                        Totale conti
                      </span>
                      <strong>
                        {euro.format(
                          bankAccounts.reduce(
                            (sum, account) => sum + account.balance,
                            0,
                          ),
                        )}
                      </strong>
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                    Nessun conto aggiunto. Puoi inserire banche, carte o contanti.
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {settings.enabledSections.mezzi && (
                <QuickCard
                  color="bg-teal"
                  icon={CarFront}
                  title="I miei mezzi"
                  text={`${deadlines.filter((d) => daysUntil(d.date) <= 45).length} scadenze vicine`}
                  onClick={() => setSection('mezzi')}
                />
              )}
              {settings.enabledSections.lavoro && (
                <QuickCard
                  color="bg-coral"
                  icon={Clock3}
                  title="Lavoro"
                  text={`${totalHours.toLocaleString('it-IT', { maximumFractionDigits: 1 })} ore`}
                  onClick={() => setSection('lavoro')}
                />
              )}
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
            description="Dati del libretto, chilometraggio, assicurazione e scadenze di ogni mezzo."
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={requestNotifications}
                  className="h-11 rounded-2xl bg-lime px-4 font-bold text-ink hover:bg-lime/85"
                >
                  <Bell /> Attiva avvisi
                </Button>
                <Button
                  onClick={openNewVehicle}
                  className="h-11 rounded-2xl bg-teal px-4 font-bold text-white hover:bg-teal/90"
                >
                  <Plus /> Aggiungi mezzo
                </Button>
              </div>
            }
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {vehicles.map((vehicle) => {
              const vehicleDeadlines = deadlines
                .filter(
                  (item) =>
                    item.vehicleId === vehicle.id ||
                    (!item.vehicleId && item.vehicle === vehicle.name),
                )
                .sort((a, b) => a.date.localeCompare(b.date));
              const VehicleIcon = vehicle.type === 'Moto' ? Bike : CarFront;
              return (
                <Card
                  key={vehicle.id}
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
                      {vehicle.name}
                    </CardTitle>
                    <p className="text-sm text-white/60">
                      Spese collegate:{' '}
                      <strong className="text-white">
                        {euro.format(vehicleSpend(vehicle))}
                      </strong>
                    </p>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <VehicleMeta label="Marca / modello">
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Da completare'}
                      </VehicleMeta>
                      <VehicleMeta label="Targa / seriale">
                        {[vehicle.plate, vehicle.serial].filter(Boolean).join(' · ') || 'Da completare'}
                      </VehicleMeta>
                      <VehicleMeta label="Alimentazione">
                        {vehicle.fuel || '—'}
                      </VehicleMeta>
                      <VehicleMeta label="Chilometraggio">
                        {vehicle.mileage
                          ? `${vehicle.mileage.toLocaleString('it-IT')} km`
                          : 'Non ancora inserito'}
                      </VehicleMeta>
                    </div>
                    {(vehicle.insuranceType ||
                      vehicle.insuranceProvider ||
                      vehicle.insuranceCoverage) && (
                      <div className="mt-4 rounded-2xl bg-teal/10 p-3 text-sm">
                        <p className="font-bold text-teal">Assicurazione</p>
                        <p className="mt-1 text-muted-foreground">
                          {[vehicle.insuranceType, vehicle.insuranceProvider]
                            .filter(Boolean)
                            .join(' · ') || 'Dati assicurazione'}
                        </p>
                        {vehicle.insuranceCoverage && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            Copre: {vehicle.insuranceCoverage}
                          </p>
                        )}
                      </div>
                    )}
                    {vehicle.mileageUpdates.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-muted p-3">
                        <p className="text-xs font-black uppercase tracking-[.12em] text-muted-foreground">
                          Ultimi aggiornamenti km
                        </p>
                        <div className="mt-2 space-y-1">
                          {vehicle.mileageUpdates.slice(0, 2).map((update) => (
                            <div
                              key={update.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span>
                                {shortDate.format(
                                  new Date(`${update.date}T00:00:00`),
                                )}
                              </span>
                              <strong>
                                {update.km.toLocaleString('it-IT')} km
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        className="rounded-2xl bg-teal text-white hover:bg-teal/90"
                        onClick={() => openEditVehicle(vehicle)}
                        type="button"
                      >
                        <Pencil /> Modifica
                      </Button>
                      <Button
                        className="rounded-2xl"
                        onClick={() => deleteVehicle(vehicle)}
                        type="button"
                        variant="outline"
                      >
                        <Trash2 /> Elimina
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!vehicles.length && (
              <EmptyState text="Aggiungi il tuo primo mezzo per iniziare." />
            )}
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
                  label="Guadagno teorico"
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
                    Riepilogo mensile
                  </CardTitle>
                  <p className="text-sm capitalize text-muted-foreground">
                    Guadagno teorico e buoni pasto · {monthName}
                  </p>
                </CardHeader>
                <CardContent className="h-[230px] px-3 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Guadagno',
                          value: wage,
                          fill: appearance.brandColor,
                        },
                        {
                          name: 'Buoni pasto',
                          value: benefits,
                          fill: appearance.accentColor,
                        },
                      ]}
                      barSize={56}
                      margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--border)"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        formatter={(value) => [
                          euro.format(Number(value)),
                          'Totale',
                        ]}
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--popover)',
                          color: 'var(--popover-foreground)',
                          boxShadow: '0 12px 30px rgba(20,47,42,.12)',
                        }}
                      />
                      <Bar dataKey="value" radius={[14, 14, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
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
                    <Button
                      className="h-11 rounded-2xl bg-teal font-bold text-white hover:bg-teal/90 sm:col-span-2"
                      type="submit"
                    >
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
            <aside className="space-y-5">
              <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
                <CardHeader className="px-5 pt-5">
                  <CardTitle className="flex items-center gap-2 font-heading text-xl font-extrabold">
                    <Settings2 className="size-5 text-teal" /> Impostazioni paga
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
              <Card className="rounded-[1.75rem] border-0 bg-card shadow-sm ring-1 ring-ink/7">
                <CardHeader className="px-5 pt-5">
                  <CardTitle className="flex items-center gap-2 font-heading text-xl font-extrabold">
                    <MapPin className="size-5 text-teal" /> Azienda
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Salva i riferimenti del luogo in cui lavori.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Nome azienda">
                    <Input
                      autoComplete="organization"
                      placeholder="Es. Azienda S.r.l."
                      value={settings.company.name}
                      onChange={(event) =>
                        updateCompany('name', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Indirizzo">
                    <Input
                      autoComplete="street-address"
                      placeholder="Via, numero civico"
                      value={settings.company.address}
                      onChange={(event) =>
                        updateCompany('address', event.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Città">
                      <Input
                        autoComplete="address-level2"
                        value={settings.company.city}
                        onChange={(event) =>
                          updateCompany('city', event.target.value)
                        }
                      />
                    </Field>
                    <Field label="CAP">
                      <Input
                        autoComplete="postal-code"
                        inputMode="numeric"
                        value={settings.company.postalCode}
                        onChange={(event) =>
                          updateCompany('postalCode', event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Partita IVA (facoltativa)">
                      <Input
                        value={settings.company.vatNumber}
                        onChange={(event) =>
                          updateCompany('vatNumber', event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Telefono (facoltativo)">
                      <Input
                        autoComplete="tel"
                        inputMode="tel"
                        value={settings.company.phone}
                        onChange={(event) =>
                          updateCompany('phone', event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Email aziendale (facoltativa)">
                    <Input
                      autoComplete="email"
                      inputMode="email"
                      type="email"
                      value={settings.company.email}
                      onChange={(event) =>
                        updateCompany('email', event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Note (facoltative)">
                    <Textarea
                      placeholder="Referente, sede, note utili…"
                      value={settings.company.notes}
                      onChange={(event) =>
                        updateCompany('notes', event.target.value)
                      }
                    />
                  </Field>
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={bankOpen}
        onOpenChange={(open) => {
          setBankOpen(open);
          if (!open) setEditingBankId(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.75rem] p-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <WalletCards className="size-6 text-teal" />
              {editingBankId ? 'Modifica conto' : 'Aggiungi conto'}
            </DialogTitle>
            <DialogDescription>
              Salva banche, carte o contanti e tieni sotto controllo il saldo di
              ogni conto.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={saveBank}>
            <Field label="Nome banca o conto">
              <Input
                required
                placeholder="Es. Intesa Sanpaolo"
                value={bankDraft.name}
                onChange={(event) =>
                  setBankDraft({ ...bankDraft, name: event.target.value })
                }
              />
            </Field>
            <Field label="Saldo (€)">
              <Input
                required
                inputMode="decimal"
                step="0.01"
                type="number"
                value={bankDraft.balance}
                onChange={(event) =>
                  setBankDraft({ ...bankDraft, balance: event.target.value })
                }
              />
            </Field>
            <Field label="IBAN o riferimento (facoltativo)">
              <Input
                autoComplete="off"
                placeholder="IT00 0000 0000 0000 0000 0000 000"
                value={bankDraft.iban}
                onChange={(event) =>
                  setBankDraft({ ...bankDraft, iban: event.target.value })
                }
              />
            </Field>
            <Field label="Note (facoltative)">
              <Textarea
                placeholder="Es. conto per le spese fisse"
                value={bankDraft.notes}
                onChange={(event) =>
                  setBankDraft({ ...bankDraft, notes: event.target.value })
                }
              />
            </Field>
            <DialogFooter>
              <Button onClick={() => setBankOpen(false)} type="button" variant="ghost">
                Annulla
              </Button>
              <Button className="bg-teal font-bold text-white hover:bg-teal/90" type="submit">
                <Check /> Salva conto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationHelpOpen} onOpenChange={setNotificationHelpOpen}>
        <DialogContent className="rounded-[1.75rem] p-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <Bell className="size-6 text-teal" /> Notifiche da attivare
            </DialogTitle>
            <DialogDescription>
              Il browser ha bloccato le notifiche per questo sito. Puoi abilitarle
              in qualsiasi momento dalle impostazioni del browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-2xl bg-muted/70 p-4 text-sm leading-relaxed">
            <p>
              Apri le impostazioni del browser per questo sito, imposta
              <strong> Notifiche → Consenti</strong>, poi torna qui e premi
              “Riprova ora”. Su iPhone puoi anche verificare le notifiche del
              browser in Impostazioni di iOS.
            </p>
            <p className="text-muted-foreground">
              Se preferisci, puoi rimandare il promemoria: te lo riproporremo tra
              una settimana.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button onClick={postponeNotifications} type="button" variant="ghost">
              Ricordamelo tra 7 giorni
            </Button>
            <Button
              className="bg-teal font-bold text-white hover:bg-teal/90"
              onClick={() => {
                setNotificationHelpOpen(false);
                window.setTimeout(() => void requestNotifications(), 0);
              }}
              type="button"
            >
              Riprova ora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    value={expenseDraft.vehicleId || expenseDraft.vehicle}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const linkedVehicle = vehicles.find(
                        (vehicle) => vehicle.id === selected,
                      );
                      setExpenseDraft({
                        ...expenseDraft,
                        vehicle: linkedVehicle?.type ?? 'Altro',
                        vehicleId: linkedVehicle?.id ?? '',
                      });
                    }}
                  >
                    {vehicles.map((vehicle) => (
                      <NativeSelectOption key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="Altro">
                      Altro / non in elenco
                    </NativeSelectOption>
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
        open={vehicleOpen}
        onOpenChange={(open) => {
          setVehicleOpen(open);
          if (!open) setEditingVehicleId(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.75rem] p-5 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              {editingVehicleId ? <Pencil className="size-6 text-teal" /> : <Plus className="size-6 text-teal" />}
              {editingVehicleId ? 'Modifica mezzo' : 'Aggiungi mezzo'}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati principali del libretto e tieni aggiornati km e
              assicurazione.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-5" onSubmit={saveVehicle}>
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="mb-4 text-sm font-bold">Dati del veicolo</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome del mezzo">
                  <Input
                    required
                    placeholder="Es. Panda di famiglia"
                    value={vehicleDraft.name}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Tipo">
                  <NativeSelect
                    className="w-full"
                    value={vehicleDraft.type}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        type: event.target.value as Vehicle,
                      })
                    }
                  >
                    <NativeSelectOption value="Macchina">Macchina</NativeSelectOption>
                    <NativeSelectOption value="Moto">Moto</NativeSelectOption>
                    <NativeSelectOption value="Altro">Altro</NativeSelectOption>
                  </NativeSelect>
                </Field>
                <Field label="Marca">
                  <Input
                    autoComplete="off"
                    placeholder="Es. Fiat"
                    value={vehicleDraft.brand}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        brand: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Modello">
                  <Input
                    autoComplete="off"
                    placeholder="Es. Panda 1.2"
                    value={vehicleDraft.model}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        model: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Targa">
                  <Input
                    autoComplete="off"
                    placeholder="Es. AB123CD"
                    value={vehicleDraft.plate}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        plate: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Numero di telaio / seriale">
                  <Input
                    autoComplete="off"
                    placeholder="Numero riportato sul libretto"
                    value={vehicleDraft.serial}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        serial: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Alimentazione">
                  <NativeSelect
                    className="w-full"
                    value={vehicleDraft.fuel}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        fuel: event.target.value,
                      })
                    }
                  >
                    {['Benzina', 'Diesel / gasolio', 'Elettrica', 'Ibrida', 'GPL', 'Metano', 'Altro'].map(
                      (fuel) => (
                        <NativeSelectOption key={fuel} value={fuel}>
                          {fuel}
                        </NativeSelectOption>
                      ),
                    )}
                  </NativeSelect>
                </Field>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="mb-4 text-sm font-bold">Chilometraggio</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Km attuali">
                  <Input
                    inputMode="numeric"
                    min="0"
                    placeholder="Es. 85400"
                    type="number"
                    value={vehicleDraft.mileage}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        mileage: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Data aggiornamento km">
                  <Input
                    type="date"
                    value={vehicleDraft.mileageDate}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        mileageDate: event.target.value,
                      })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Nota aggiornamento (facoltativa)">
                    <Input
                      placeholder="Es. Tagliando annuale"
                      value={vehicleDraft.mileageNote}
                      onChange={(event) =>
                        setVehicleDraft({
                          ...vehicleDraft,
                          mileageNote: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-teal/10 p-4">
              <p className="mb-4 text-sm font-bold text-teal">Assicurazione</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo di assicurazione">
                  <Input
                    placeholder="Es. RCA, furto e incendio"
                    value={vehicleDraft.insuranceType}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        insuranceType: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Compagnia assicurativa">
                  <Input
                    placeholder="Es. Allianz"
                    value={vehicleDraft.insuranceProvider}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        insuranceProvider: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Scadenza assicurazione">
                  <Input
                    type="date"
                    value={vehicleDraft.insuranceExpiry}
                    onChange={(event) =>
                      setVehicleDraft({
                        ...vehicleDraft,
                        insuranceExpiry: event.target.value,
                      })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Cosa copre / garanzie">
                    <Textarea
                      placeholder="Es. Responsabilità civile, cristalli, assistenza stradale…"
                      value={vehicleDraft.insuranceCoverage}
                      onChange={(event) =>
                        setVehicleDraft({
                          ...vehicleDraft,
                          insuranceCoverage: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>

            <Field label="Note aggiuntive (facoltative)">
              <Textarea
                placeholder="Annotazioni sul mezzo, accessori o documenti…"
                value={vehicleDraft.notes}
                onChange={(event) =>
                  setVehicleDraft({ ...vehicleDraft, notes: event.target.value })
                }
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVehicleOpen(false)}
              >
                Annulla
              </Button>
              <Button
                className="bg-teal font-bold text-white hover:bg-teal/90"
                type="submit"
              >
                <Check /> Salva mezzo
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
              Scadenze {deadlineVehicle?.name}
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
                      (item.vehicleId === deadlineVehicle.id ||
                        (!item.vehicleId &&
                          item.vehicle === deadlineVehicle.name)) &&
                      item.label === label,
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
                                  (item.vehicleId === deadlineVehicle.id ||
                                    (!item.vehicleId &&
                                      item.vehicle === deadlineVehicle.name)) &&
                                  item.label === label
                                ),
                            );
                            return date
                              ? [
                                  ...without,
                                  {
                                    id: current?.id ?? uid('deadline'),
                                    vehicle: deadlineVehicle.name,
                                    vehicleId: deadlineVehicle.id,
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

      <Dialog
        open={authOpen}
        onOpenChange={(open) => {
          setAuthOpen(open);
          if (!open) {
            setAuthError('');
            setAuthPassword('');
          }
        }}
      >
        <DialogContent className="rounded-[1.75rem] p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <LockKeyhole className="size-6 text-teal" /> {authTitle}
            </DialogTitle>
            <DialogDescription>
              Usa email e password per proteggere il tuo accesso personale.
            </DialogDescription>
          </DialogHeader>
          {!firebaseConfigured && (
            <div className="flex gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <LockKeyhole className="mt-0.5 size-5 shrink-0" />
              <p>
                Firebase non è ancora configurato. Aggiungi le variabili{' '}
                <code className="font-bold">VITE_FIREBASE_*</code> in{' '}
                <code className="font-bold">.env.local</code> e nei Secrets di
                GitHub Actions per attivare questo pannello.
              </p>
            </div>
          )}
          <form className="grid gap-4" onSubmit={submitAuth}>
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  required
                  autoComplete="email"
                  className="pl-9"
                  inputMode="email"
                  placeholder="nome@esempio.it"
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </div>
            </Field>
            {authMode !== 'reset' && (
              <Field label="Password">
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    required
                    autoComplete={
                      authMode === 'signup'
                        ? 'new-password'
                        : 'current-password'
                    }
                    className="pl-9"
                    minLength={6}
                    placeholder="Almeno 6 caratteri"
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                  />
                </div>
              </Field>
            )}
            {authError && (
              <p
                aria-live="polite"
                className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-semibold text-coral"
                role="alert"
              >
                {authError}
              </p>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                className="w-full bg-ink text-white hover:bg-ink/90"
                disabled={authBusy || !firebaseConfigured}
                type="submit"
              >
                {authBusy ? 'Attendi…' : authSubmitLabel}
              </Button>
              {authMode === 'login' && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setAuthMode('reset');
                    setAuthError('');
                    setAuthPassword('');
                  }}
                  type="button"
                  variant="ghost"
                >
                  Hai dimenticato la password?
                </Button>
              )}
            </DialogFooter>
          </form>
          <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
            {authMode === 'signup' ? (
              <>
                Hai già un account?{' '}
                <button
                  className="font-bold text-ink underline-offset-4 hover:underline"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  type="button"
                >
                  Accedi
                </button>
              </>
            ) : authMode === 'reset' ? (
              <>
                Ricordi la password?{' '}
                <button
                  className="font-bold text-ink underline-offset-4 hover:underline"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  type="button"
                >
                  Torna all’accesso
                </button>
              </>
            ) : (
              <>
                Non hai un account?{' '}
                <button
                  className="font-bold text-ink underline-offset-4 hover:underline"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  type="button"
                >
                  Registrati
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={accountOpen}
        onOpenChange={(open) => {
          setAccountOpen(open);
          if (!open) setAccountError('');
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.75rem] p-5 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <UserRound className="size-6 text-teal" /> Impostazioni account
            </DialogTitle>
            <DialogDescription>
              Gestisci i tuoi dati personali e gli indirizzi salvati nel tuo
              spazio Crimi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-2xl bg-muted/60 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-teal text-white">
                  <ShieldCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Account autenticato</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {authUser.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome utente">
                  <Input
                    autoComplete="nickname"
                    placeholder="Come vuoi essere chiamato?"
                    value={profile.username}
                    onChange={(event) =>
                      updateProfile('username', event.target.value)
                    }
                  />
                </Field>
                <Field label="Data di nascita">
                  <Input
                    autoComplete="bday"
                    type="date"
                    value={profile.birthDate}
                    onChange={(event) =>
                      updateProfile('birthDate', event.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Indirizzo di casa">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoComplete="street-address"
                      className="pl-9"
                      placeholder="Via, numero, città"
                      value={profile.homeAddress}
                      onChange={(event) =>
                        updateProfile('homeAddress', event.target.value)
                      }
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Altri indirizzi</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Salva lavoro, famiglia o altri luoghi utili.
                  </p>
                </div>
                <Button
                  className="shrink-0 rounded-xl"
                  onClick={addAddress}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus /> Aggiungi
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {profile.additionalAddresses.length ? (
                  profile.additionalAddresses.map((address, index) => (
                    <div key={`address-${index}`} className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          aria-label={`Altro indirizzo ${index + 1}`}
                          autoComplete="street-address"
                          className="pl-9"
                          placeholder={`Indirizzo ${index + 1}`}
                          value={address}
                          onChange={(event) =>
                            updateAddress(index, event.target.value)
                          }
                        />
                      </div>
                      <Button
                        aria-label={`Rimuovi indirizzo ${index + 1}`}
                        className="shrink-0"
                        onClick={() => removeAddress(index)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
                    Nessun indirizzo aggiuntivo.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Password</p>
                <p className="mt-1 text-xs text-white/60">
                  Ricevi un link sicuro per scegliere una nuova password.
                </p>
              </div>
              <Button
                className="shrink-0 rounded-xl bg-white text-ink hover:bg-white/90"
                onClick={() => void sendAccountPasswordReset()}
                type="button"
                variant="secondary"
              >
                <Mail /> Invia reset
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-teal font-bold text-white hover:bg-teal/90"
              onClick={() => {
                const cleaned: Profile = {
                  ...profile,
                  username: profile.username.trim(),
                  homeAddress: profile.homeAddress.trim(),
                  additionalAddresses: profile.additionalAddresses
                    .map((address) => address.trim())
                    .filter(Boolean),
                };
                setProfile(cleaned);
                setAccountOpen(false);
                setNotice('Profilo account aggiornato.');
              }}
            >
              Salva profilo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="inset-0 left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 bg-background p-4 sm:max-w-none sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-black">
              <Settings2 className="size-6 text-teal" /> Impostazioni
            </DialogTitle>
            <DialogDescription>
              Account, personalizzazione e temi riuniti in un unico spazio.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            className="mt-2"
            value={settingsTab}
            onValueChange={(value) =>
              setSettingsTab(value as typeof settingsTab)
            }
          >
            <TabsList className="grid h-auto w-full min-w-0 grid-cols-2 overflow-hidden rounded-2xl bg-muted p-1 sm:grid-cols-4">
              <TabsTrigger
                value="account"
                className="min-w-0 overflow-hidden rounded-xl py-2 text-xs sm:text-sm"
              >
                Account
              </TabsTrigger>
              <TabsTrigger
                value="personalizza"
                className="min-w-0 overflow-hidden rounded-xl py-2 text-xs sm:text-sm"
              >
                Personalizza
              </TabsTrigger>
              <TabsTrigger
                value="temi"
                className="min-w-0 overflow-hidden rounded-xl py-2 text-xs sm:text-sm"
              >
                Temi
              </TabsTrigger>
              <TabsTrigger
                value="sezioni"
                className="min-w-0 overflow-hidden rounded-xl py-2 text-xs sm:text-sm"
              >
                Sezioni
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
              <AccountSettingsPanel
                authUser={authUser}
                onAddAddress={addAddress}
                onProfileChange={updateProfile}
                onRemoveAddress={removeAddress}
                onResetPassword={() => void sendAccountPasswordReset()}
                onUpdateAddress={updateAddress}
                profile={profile}
              />
            </TabsContent>
            <TabsContent value="personalizza" className="mt-4">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Dimensione testo">
                <NativeSelect
                  className="w-full"
                  value={appearance.textScale}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      textScale: event.target.value as Appearance['textScale'],
                    })
                  }
                >
                  <NativeSelectOption value="small">Compatta</NativeSelectOption>
                  <NativeSelectOption value="medium">Standard</NativeSelectOption>
                  <NativeSelectOption value="large">Grande</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field label="Densità interfaccia">
                <NativeSelect
                  className="w-full"
                  value={appearance.density}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      density: event.target.value as Appearance['density'],
                    })
                  }
                >
                  <NativeSelectOption value="compact">Compatta</NativeSelectOption>
                  <NativeSelectOption value="comfortable">
                    Standard
                  </NativeSelectOption>
                  <NativeSelectOption value="spacious">Aria</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field label="Stile angoli">
                <NativeSelect
                  className="w-full"
                  value={appearance.radius}
                  onChange={(event) =>
                    setAppearance({
                      ...appearance,
                      radius: event.target.value as Appearance['radius'],
                    })
                  }
                >
                  <NativeSelectOption value="soft">Molto morbidi</NativeSelectOption>
                  <NativeSelectOption value="rounded">Arrotondati</NativeSelectOption>
                  <NativeSelectOption value="sharp">Netti</NativeSelectOption>
                </NativeSelect>
              </Field>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:col-span-2 lg:col-span-1">
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">Contrasto elevato</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Aumenta la leggibilità di testi e bordi.
                  </span>
                </span>
                <Switch
                  aria-label="Attiva contrasto elevato"
                  checked={appearance.highContrast}
                  onCheckedChange={(checked) =>
                    setAppearance({ ...appearance, highContrast: checked })
                  }
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:col-span-2 lg:col-span-2">
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm">Riduci animazioni</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Riduce transizioni e movimenti per un’esperienza più calma.
                  </span>
                </span>
                <Switch
                  aria-label="Riduci animazioni"
                  checked={appearance.reduceMotion}
                  onCheckedChange={(checked) =>
                    setAppearance({ ...appearance, reduceMotion: checked })
                  }
                />
              </div>
            </div>
            <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
              <div>
                <p className="text-sm font-bold">Temi salvati</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Salva questa combinazione di colori, font e modalità per
                  riutilizzarla quando vuoi.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <NativeSelect
                  aria-label="Scegli un tema salvato"
                  className="w-full"
                  disabled={!savedThemes.length}
                  value={selectedSavedThemeId}
                  onChange={(event) => applySavedTheme(event.target.value)}
                >
                  <NativeSelectOption value="">
                    {savedThemes.length
                      ? 'Scegli un tema salvato'
                      : 'Nessun tema salvato'}
                  </NativeSelectOption>
                  {savedThemes.map((theme) => (
                    <NativeSelectOption key={theme.id} value={theme.id}>
                      {theme.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button
                  aria-label="Elimina tema selezionato"
                  className="sm:w-auto"
                  disabled={!selectedSavedThemeId}
                  onClick={deleteSelectedTheme}
                  type="button"
                  variant="outline"
                >
                  <Trash2 />
                  <span>Elimina</span>
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  aria-label="Nome del nuovo tema"
                  placeholder="Nome del nuovo tema"
                  value={savedThemeName}
                  onChange={(event) => setSavedThemeName(event.target.value)}
                />
                <Button
                  className="bg-teal text-white hover:bg-teal/90 sm:w-auto"
                  onClick={saveTheme}
                  type="button"
                >
                  <Check /> Salva tema
                </Button>
              </div>
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
            </TabsContent>
            <TabsContent value="temi" className="mt-4">
              <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
                <div>
                  <p className="text-sm font-bold">Temi salvati</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Riapplica o elimina le combinazioni di colori, font e
                    modalità che hai salvato.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <NativeSelect
                    aria-label="Scegli un tema salvato"
                    className="w-full"
                    disabled={!savedThemes.length}
                    value={selectedSavedThemeId}
                    onChange={(event) => applySavedTheme(event.target.value)}
                  >
                    <NativeSelectOption value="">
                      {savedThemes.length
                        ? 'Scegli un tema salvato'
                        : 'Nessun tema salvato'}
                    </NativeSelectOption>
                    {savedThemes.map((theme) => (
                      <NativeSelectOption key={theme.id} value={theme.id}>
                        {theme.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    aria-label="Elimina tema selezionato"
                    className="sm:w-auto"
                    disabled={!selectedSavedThemeId}
                    onClick={deleteSelectedTheme}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 /> <span>Elimina</span>
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    aria-label="Nome del nuovo tema"
                    placeholder="Nome del nuovo tema"
                    value={savedThemeName}
                    onChange={(event) => setSavedThemeName(event.target.value)}
                  />
                  <Button
                    className="bg-teal text-white hover:bg-teal/90 sm:w-auto"
                    onClick={saveTheme}
                    type="button"
                  >
                    <Check /> Salva tema
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="sezioni" className="mt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold">Sezioni visibili</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attiva solo gli strumenti che usi. La scelta viene salvata
                    nel tuo account.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SECTION_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                    <div
                      key={value}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal/12 text-teal">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm">{label}</strong>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {description}
                        </span>
                      </span>
                      <Switch
                        aria-label={`${settings.enabledSections[value] ? 'Disattiva' : 'Attiva'} sezione ${label}`}
                        checked={settings.enabledSections[value]}
                        onCheckedChange={(checked) =>
                          toggleSection(value, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              className="bg-teal font-bold text-white hover:bg-teal/90"
              onClick={() => {
                if (settingsTab === 'account') saveProfile();
                else setAppearanceOpen(false);
              }}
            >
              {settingsTab === 'account' ? 'Salva profilo' : 'Fatto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-3 bottom-3 z-50 grid rounded-[1.4rem] bg-ink p-2 text-white shadow-2xl lg:hidden"
        style={{
          gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))`,
        }}
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
      {settings.enabledSections.spese && (
        <Button
          aria-label="Aggiungi una nuova spesa"
          onClick={() => setExpenseOpen(true)}
          className="fixed bottom-20 right-5 z-40 size-14 rounded-full bg-lime text-ink shadow-xl hover:bg-lime/90 sm:hidden"
          size="icon-lg"
        >
          <Plus className="size-6" />
        </Button>
      )}
    </main>
  );
}

function AccountLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 text-sm font-semibold shadow-lg ring-1 ring-ink/10">
        <span className="size-3 animate-pulse rounded-full bg-teal" />
        Caricamento del tuo spazio personale…
      </div>
    </main>
  );
}

function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const title =
    mode === 'signup'
      ? 'Crea il tuo account'
      : mode === 'reset'
        ? 'Reimposta password'
        : 'Accedi a Crimi';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!firebaseConfigured || !firebaseAuth) {
      setError(
        'Firebase non è configurato. Completa i valori VITE_FIREBASE_* nella build.',
      );
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Inserisci il tuo indirizzo email.');
      return;
    }
    if (mode !== 'reset' && password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      return;
    }
    if (mode === 'signup' && username.trim().length < 2) {
      setError('Inserisci un nome utente di almeno 2 caratteri.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(firebaseAuth, cleanEmail);
        setMode('login');
        setPassword('');
        setMessage(
          'Email di reset inviata. Controlla la tua casella di posta.',
        );
      } else if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          cleanEmail,
          password,
        );
        if (firebaseDb) {
          await setDoc(
            doc(firebaseDb, 'users', credential.user.uid, 'organiser', 'state'),
            {
              profile: {
                ...initialProfile,
                username: username.trim(),
                birthDate,
                homeAddress: homeAddress.trim(),
              },
            },
            { merge: true },
          ).catch(() => undefined);
        }
      } else {
        await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
      }
      setPassword('');
    } catch (authError) {
      setError(authErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full bg-lime/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <section className="space-y-5 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <span className="grid size-14 place-items-center rounded-[1.3rem] bg-ink text-lime shadow-[0_0_0_6px_rgba(33,161,121,.16)]">
              <CircleGauge className="size-7" strokeWidth={2.3} />
            </span>
            <span className="text-left">
              <span className="block text-xs font-black uppercase tracking-[.22em] text-teal">
                Crimi
              </span>
              <span className="block font-heading text-2xl font-black tracking-[-.04em]">
                Life Organiser
              </span>
            </span>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[.18em] text-teal">
              Il tuo spazio personale
            </p>
            <h1 className="mt-3 font-heading text-4xl font-black tracking-[-.06em] sm:text-6xl">
              Tutto sotto controllo, account dopo account.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground lg:mx-0">
              Accedi per ritrovare spese, ore, mezzi e preferenze anche quando
              chiudi la pagina. Ogni account ha il suo spazio privato.
            </p>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[2rem] border-0 p-2 shadow-[0_24px_80px_rgba(15,61,94,.18)] ring-1 ring-ink/10">
          <CardContent className="rounded-[1.5rem] p-5 sm:p-7">
            <div className="mb-6">
              <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-teal/15 text-teal">
                <LockKeyhole className="size-5" />
              </div>
              <h2 className="font-heading text-2xl font-black">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === 'reset'
                  ? 'Riceverai un link per scegliere una nuova password.'
                  : 'Usa email e password per entrare nel tuo spazio Crimi.'}
              </p>
            </div>
            {!firebaseConfigured && (
              <div className="mb-5 flex gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                <LockKeyhole className="mt-0.5 size-5 shrink-0" />
                <p>
                  Firebase non è ancora configurato. Inserisci i Secrets
                  Firebase nella repository e rilancia la build Pages.
                </p>
              </div>
            )}
            <form className="grid gap-4" onSubmit={submit}>
              <Field label="Email">
                <Input
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nome@esempio.it"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              {mode === 'signup' && (
                <>
                  <Field label="Nome utente">
                    <Input
                      required
                      autoComplete="nickname"
                      placeholder="Come vuoi essere chiamato?"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Data di nascita (facoltativa)">
                      <Input
                        autoComplete="bday"
                        type="date"
                        value={birthDate}
                        onChange={(event) => setBirthDate(event.target.value)}
                      />
                    </Field>
                    <Field label="Indirizzo di casa (facoltativo)">
                      <Input
                        autoComplete="street-address"
                        placeholder="Via, numero, città"
                        value={homeAddress}
                        onChange={(event) =>
                          setHomeAddress(event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </>
              )}
              {mode !== 'reset' && (
                <Field label="Password">
                  <Input
                    required
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    minLength={6}
                    placeholder="Almeno 6 caratteri"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
              )}
              {error && (
                <p
                  aria-live="polite"
                  className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-semibold text-coral"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {message && (
                <output
                  aria-live="polite"
                  className="rounded-xl bg-teal/10 px-3 py-2 text-sm font-semibold text-teal"
                >
                  {message}
                </output>
              )}
              <Button
                className="mt-1 h-11 w-full bg-ink text-white hover:bg-ink/90"
                disabled={busy || !firebaseConfigured}
                type="submit"
              >
                {busy
                  ? 'Attendi…'
                  : mode === 'signup'
                    ? 'Crea account'
                    : mode === 'reset'
                      ? 'Invia email di reset'
                      : 'Accedi'}
              </Button>
              {mode === 'login' && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setMode('reset');
                    setError('');
                  }}
                  type="button"
                  variant="ghost"
                >
                  Hai dimenticato la password?
                </Button>
              )}
            </form>
            <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
              {mode === 'signup' ? (
                <>
                  Hai già un account?{' '}
                  <button
                    className="font-bold text-ink underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    type="button"
                  >
                    Accedi
                  </button>
                </>
              ) : mode === 'reset' ? (
                <>
                  Ricordi la password?{' '}
                  <button
                    className="font-bold text-ink underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    type="button"
                  >
                    Torna all’accesso
                  </button>
                </>
              ) : (
                <>
                  Non hai un account?{' '}
                  <button
                    className="font-bold text-ink underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    type="button"
                  >
                    Registrati
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function AccountSettingsPanel({
  authUser,
  profile,
  onProfileChange,
  onAddAddress,
  onUpdateAddress,
  onRemoveAddress,
  onResetPassword,
}: {
  authUser: User;
  profile: Profile;
  onProfileChange: (
    field: keyof Profile,
    value: Profile[keyof Profile],
  ) => void;
  onAddAddress: () => void;
  onUpdateAddress: (index: number, value: string) => void;
  onRemoveAddress: (index: number) => void;
  onResetPassword: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-muted/60 p-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-teal text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Account autenticato</p>
            <p className="truncate text-sm text-muted-foreground">
              {authUser.email}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome utente">
            <Input
              autoComplete="nickname"
              placeholder="Come vuoi essere chiamato?"
              value={profile.username}
              onChange={(event) =>
                onProfileChange('username', event.target.value)
              }
            />
          </Field>
          <Field label="Data di nascita">
            <Input
              autoComplete="bday"
              type="date"
              value={profile.birthDate}
              onChange={(event) =>
                onProfileChange('birthDate', event.target.value)
              }
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Indirizzo di casa">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="street-address"
                className="pl-9"
                placeholder="Via, numero, città"
                value={profile.homeAddress}
                onChange={(event) =>
                  onProfileChange('homeAddress', event.target.value)
                }
              />
            </div>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Altri indirizzi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Salva lavoro, famiglia o altri luoghi utili.
            </p>
          </div>
          <Button
            className="shrink-0 rounded-xl"
            onClick={onAddAddress}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus /> Aggiungi
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {profile.additionalAddresses.length ? (
            profile.additionalAddresses.map((address, index) => (
              <div key={`address-${index}`} className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label={`Altro indirizzo ${index + 1}`}
                    autoComplete="street-address"
                    className="pl-9"
                    placeholder={`Indirizzo ${index + 1}`}
                    value={address}
                    onChange={(event) =>
                      onUpdateAddress(index, event.target.value)
                    }
                  />
                </div>
                <Button
                  aria-label={`Rimuovi indirizzo ${index + 1}`}
                  className="shrink-0"
                  onClick={() => onRemoveAddress(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
              Nessun indirizzo aggiuntivo.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-ink p-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold">Password</p>
          <p className="mt-1 text-xs text-white/60">
            Ricevi un link sicuro per scegliere una nuova password.
          </p>
        </div>
        <Button
          className="shrink-0 rounded-xl bg-white text-ink hover:bg-white/90"
          onClick={onResetPassword}
          type="button"
          variant="secondary"
        >
          <Mail /> Invia reset
        </Button>
      </div>
    </div>
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

function VehicleMeta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-muted px-3 py-2">
      <span className="block text-[0.65rem] font-black uppercase tracking-[.1em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-1 block truncate text-sm">{children}</strong>
    </div>
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
            className="rgb-channel flex min-w-0 items-center gap-1 overflow-hidden rounded-lg bg-muted px-1.5"
          >
            <span className="text-[0.65rem] font-black uppercase text-muted-foreground">
              {channel}
            </span>
            <Input
              aria-label={`${label} ${channel.toUpperCase()}`}
              className="h-8 w-0 min-w-0 flex-1 border-0 bg-transparent px-0 text-center text-sm font-semibold tabular-nums shadow-none"
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
