import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/storage';

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'RSD', symbol: 'din', name: 'Serbian Dinar' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnian Mark' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
];

const DEFAULT_SETTINGS = {
  currency: CURRENCIES[0], // EUR
};

const SettingsContext = createContext({});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState(null);

  // Called by AuthContext after login to load user-specific settings
  const loadSettingsForUser = async (uid) => {
    setUserId(uid);
    const s = await getSettings(uid);
    if (s) setSettings(s);
    setLoaded(true);
  };

  // Initial load without user (before login)
  useEffect(() => {
    if (!userId) setLoaded(true);
  }, []);

  const updateCurrency = async (currency) => {
    const next = { ...settings, currency };
    setSettings(next);
    if (userId) {
      await saveSettings(userId, next);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateCurrency, loadSettingsForUser }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

// Hook: returns a format function that always uses the latest currency
export const useCurrency = () => {
  const { settings } = useContext(SettingsContext);
  const symbol = settings?.currency?.symbol ?? '€';
  return React.useCallback(
    (amount) => {
      const val = parseFloat(amount || 0);
      const formatted = Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
      return `${formatted} ${symbol}`;
    },
    [symbol],
  );
};
