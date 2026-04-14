'use client';

import React, { useState, useEffect } from 'react';
import { GEMINI_MODELS } from '@/lib/models';
import { Settings, Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '@/i18n/language-provider';
import {
  ProviderConfig,
  PROVIDER_STORAGE_KEY,
  PRESET_PROVIDERS,
  isValidProviderConfig
} from '@/lib/providers';

interface Model {
  value: string;
  label: string;
  description: string;
  displayName?: string;
  inputTokenLimit?: number | null;
  outputTokenLimit?: number | null;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: ProviderConfig) => void;
  currentProvider?: ProviderConfig;
}

// Provider preset options in order
const PROVIDER_OPTIONS = [
  { key: 'gemini', label: 'settings.providerPresets.gemini' },
  { key: 'openai', label: 'settings.providerPresets.openai' },
  { key: 'deepseek', label: 'settings.providerPresets.deepseek' },
  { key: 'ollama', label: 'settings.providerPresets.ollama' },
  { key: 'custom', label: 'settings.providerPresets.custom' }
];

export function SettingsModal({
  isOpen,
  onClose,
  onSave,
  currentProvider
}: SettingsModalProps) {
  const { t, locale } = useLanguage();
  const [selectedPreset, setSelectedPreset] = useState<string>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<Model[]>(GEMINI_MODELS);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [modelInputMode, setModelInputMode] = useState(false);
  const [customModel, setCustomModel] = useState('');

  // Initialize from currentProvider or localStorage
  useEffect(() => {
    if (isOpen) {
      if (currentProvider && isValidProviderConfig(currentProvider)) {
        setApiKey(currentProvider.apiKey);
        setBaseUrl(currentProvider.baseUrl);
        setModel(currentProvider.model);
        setCustomModel(currentProvider.model);
        // Determine preset from provider type and baseUrl
        const matchedPreset = Object.entries(PRESET_PROVIDERS).find(
          ([_, preset]) =>
            preset.type === currentProvider.type &&
            (currentProvider.type === 'gemini' ||
              preset.baseUrl === currentProvider.baseUrl)
        );
        setSelectedPreset(matchedPreset?.[0] || 'custom');
      } else {
        // Try to load from localStorage
        const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
        if (stored) {
          try {
            const config: ProviderConfig = JSON.parse(stored);
            if (isValidProviderConfig(config)) {
              setApiKey(config.apiKey);
              setBaseUrl(config.baseUrl);
              setModel(config.model);
              setCustomModel(config.model);
              const matchedPreset = Object.entries(PRESET_PROVIDERS).find(
                ([_, preset]) =>
                  preset.type === config.type &&
                  (config.type === 'gemini' ||
                    preset.baseUrl === config.baseUrl)
              );
              setSelectedPreset(matchedPreset?.[0] || 'custom');
            }
          } catch {
            // Use defaults
          }
        }
      }
    }
  }, [isOpen, currentProvider]);

  // Handle manual preset change (not from initial load)
  const handlePresetChange = (newPreset: string) => {
    setSelectedPreset(newPreset);
    const preset = PRESET_PROVIDERS[newPreset];
    if (preset) {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
      setCustomModel(preset.model);
      setApiKey('');
    }
  };

  // Fetch models when API key and provider are configured
  useEffect(() => {
    const shouldFetch =
      selectedPreset !== 'ollama' && // Ollama doesn't need API key
      apiKey &&
      apiKey.trim().length > 10 &&
      baseUrl &&
      isOpen;

    if (shouldFetch) {
      const timeoutId = setTimeout(() => {
        fetchModels();
      }, 800);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, apiKey, baseUrl, selectedPreset]);

  const fetchModels = async () => {
    setLoadingModels(true);
    setModelsError('');

    const provider: ProviderConfig = {
      type: PRESET_PROVIDERS[selectedPreset].type,
      baseUrl,
      apiKey,
      model: ''
    };

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, locale })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();

      if (data.models && data.models.length > 0) {
        setModels(data.models);
        // If current model is not in the list, keep it or select first
        if (!data.models.find((m: Model) => m.value === model)) {
          setModel(data.models[0].value);
          setCustomModel(data.models[0].value);
        }
      }
    } catch {
      setModelsError(t('settings.modelFetchError'));
      // Fallback to static list for Gemini
      if (selectedPreset === 'gemini') {
        setModels(GEMINI_MODELS);
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = () => {
    // Ollama doesn't require API key
    const isOllama = selectedPreset === 'ollama';
    if (!isOllama && !apiKey.trim()) {
      return; // API key is required for non-Ollama providers
    }

    const provider: ProviderConfig = {
      type: PRESET_PROVIDERS[selectedPreset].type,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: modelInputMode ? customModel.trim() : model,
      displayName: t(`settings.providerPresets.${selectedPreset}`)
    };

    onSave(provider);
    onClose();
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBaseUrl(e.target.value);
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    setCustomModel(value);
    setModelInputMode(false);
  };

  const handleCustomModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomModel(e.target.value);
    setModel(e.target.value);
  };

  const isGemini = selectedPreset === 'gemini';
  const isOllama = selectedPreset === 'ollama';
  const requiresApiKey = !isOllama;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-[5px] border-black bg-white shadow-[12px_12px_0px_#000]">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between border-b-[3px] border-black pb-4">
            <h2
              className="text-3xl font-black tracking-tight text-black uppercase"
              style={{
                fontFamily:
                  "'Big Shoulders Display', 'Impact', 'Arial Black', sans-serif"
              }}
            >
              <span className="flex items-center gap-2">
                <Settings className="h-6 w-6" />
                {t('settings.title')}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="border-[3px] border-black p-2 text-black transition-all duration-150 hover:bg-[#F44336] hover:text-white"
              aria-label={t('settings.close')}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Provider Selection */}
          <div className="mb-6 space-y-6">
            <div>
              <label
                htmlFor="provider"
                className="mb-3 block text-sm font-bold tracking-wide text-black uppercase"
              >
                {t('settings.provider')}{' '}
                <span className="text-[#E91E63]">*</span>
              </label>
              <div className="relative">
                <select
                  id="provider"
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full appearance-none border-[3px] border-black bg-white px-4 py-3 pr-12 font-medium text-black shadow-[4px_4px_0px_#000] focus:border-[#2196F3] focus:shadow-[4px_4px_0px_#2196F3] focus:outline-none"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-black" />
              </div>
            </div>

            {/* Base URL - Hidden for Gemini */}
            {!isGemini && (
              <div>
                <label
                  htmlFor="baseUrl"
                  className="mb-3 block text-sm font-bold tracking-wide text-black uppercase"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('settings.baseUrl')}{' '}
                    {requiresApiKey && (
                      <span className="text-[#E91E63]">*</span>
                    )}
                  </span>
                </label>
                <input
                  type="text"
                  id="baseUrl"
                  value={baseUrl}
                  onChange={handleBaseUrlChange}
                  placeholder={t('settings.baseUrlPlaceholder')}
                  className="w-full border-[3px] border-black bg-white px-4 py-3 font-medium text-black placeholder-gray-500 shadow-[4px_4px_0px_#000] focus:border-[#2196F3] focus:shadow-[4px_4px_0px_#2196F3] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* API Key Section */}
          <div className="mb-8 space-y-6">
            <div>
              <label
                htmlFor="apiKey"
                className="mb-3 block text-sm font-bold tracking-wide text-black uppercase"
              >
                {t('settings.apiKeyLabel')}
                {requiresApiKey && <span className="text-[#E91E63]">*</span>}
                {!requiresApiKey && (
                  <span className="ml-2 text-xs font-normal text-gray-600">
                    (optional)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  id="apiKey"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full border-[3px] border-black bg-white px-4 py-3 pr-24 font-medium text-black placeholder-gray-500 shadow-[4px_4px_0px_#000] focus:border-[#2196F3] focus:shadow-[4px_4px_0px_#2196F3] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 border-[2px] border-black bg-[#FFEB3B] px-3 py-1 text-xs font-bold uppercase transition-colors hover:bg-[#FDD835]"
                >
                  {showApiKey ? t('settings.hide') : t('settings.show')}
                </button>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">
                {t('settings.getApiKey')}{' '}
                {selectedPreset === 'gemini' ? (
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#2196F3] underline hover:text-[#1976D2]"
                  >
                    Google AI Studio
                  </a>
                ) : selectedPreset === 'openai' ? (
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#2196F3] underline hover:text-[#1976D2]"
                  >
                    OpenAI Platform
                  </a>
                ) : selectedPreset === 'deepseek' ? (
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#2196F3] underline hover:text-[#1976D2]"
                  >
                    DeepSeek Platform
                  </a>
                ) : (
                  <span className="font-medium text-gray-600">
                    {selectedPreset === 'ollama'
                      ? 'Ollama runs locally, no API key needed'
                      : 'your provider documentation'}
                  </span>
                )}
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label
                  htmlFor="model"
                  className="block text-sm font-bold tracking-wide text-black uppercase"
                >
                  {t('settings.modelSelection')}
                </label>
                {loadingModels && (
                  <span className="flex items-center text-xs font-bold text-[#2196F3] uppercase">
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t('settings.fetching')}
                  </span>
                )}
                {!loadingModels && models.length > 0 && (
                  <span className="text-xs font-bold text-[#4CAF50] uppercase">
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {models.length} {t('settings.loaded')}
                    </span>
                  </span>
                )}
              </div>

              {modelsError && (
                <div className="mb-3 border-[3px] border-black bg-[#FF9800] px-4 py-2 text-sm font-bold text-black">
                  {modelsError}
                </div>
              )}

              {!modelInputMode ? (
                <div className="flex gap-2">
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={loadingModels}
                    className="flex-1 border-[3px] border-black bg-white px-4 py-3 font-medium text-black shadow-[4px_4px_0px_#000] focus:border-[#2196F3] focus:shadow-[4px_4px_0px_#2196F3] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {models.map((modelOption) => (
                      <option key={modelOption.value} value={modelOption.value}>
                        {modelOption.displayName || modelOption.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setModelInputMode(true)}
                    className="border-[2px] border-black bg-white px-3 py-2 text-xs font-bold text-black uppercase transition-colors hover:bg-[#FFEB3B]"
                    title="Custom model"
                  >
                    ✏️
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customModel}
                    onChange={handleCustomModelChange}
                    placeholder="e.g., gpt-4o, llama3.2, deepseek-chat"
                    className="flex-1 border-[3px] border-black bg-white px-4 py-3 font-medium text-black placeholder-gray-500 shadow-[4px_4px_0px_#000] focus:border-[#2196F3] focus:shadow-[4px_4px_0px_#2196F3] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModelInputMode(false);
                      if (models.length > 0) {
                        setModel(models[0].value);
                        setCustomModel(models[0].value);
                      }
                    }}
                    className="border-[2px] border-black bg-white px-3 py-2 text-xs font-bold text-black uppercase transition-colors hover:bg-[#FFEB3B]"
                    title="Use preset"
                  >
                    📋
                  </button>
                </div>
              )}

              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {models.find((m) => m.value === model)?.description ||
                    (modelInputMode && customModel
                      ? `Custom model: ${customModel}`
                      : '')}
                </p>
                {!modelInputMode &&
                  models.find((m) => m.value === model)?.inputTokenLimit && (
                    <p className="text-xs font-medium text-gray-600">
                      {t('settings.inputLimit')}{' '}
                      {models
                        .find((m) => m.value === model)
                        ?.inputTokenLimit?.toLocaleString()}{' '}
                      {t('settings.tokens')}
                      {models.find((m) => m.value === model)
                        ?.outputTokenLimit &&
                        ` • ${t('settings.outputLimit')} ${models.find((m) => m.value === model)?.outputTokenLimit?.toLocaleString()} ${t('settings.tokens')}`}
                    </p>
                  )}
              </div>
            </div>

            {/* Token Info */}
            <div className="border-[3px] border-black bg-[#2196F3] p-6 shadow-[4px_4px_0px_#000]">
              <div className="flex items-start">
                <svg
                  className="mt-0.5 mr-4 h-6 w-6 flex-shrink-0 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="mb-2 text-base font-black text-white uppercase">
                    {t('settings.unlimitedTitle')}
                  </h4>
                  <p className="text-sm font-medium text-white">
                    {t('settings.unlimitedDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 border-t-[3px] border-black pt-6">
            <button
              onClick={handleSave}
              disabled={requiresApiKey && !apiKey.trim()}
              className="flex-1 border-[3px] border-black bg-[#FFEB3B] px-6 py-3 font-bold tracking-wide text-black uppercase shadow-[4px_4px_0px_#000] transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-[4px_4px_0px_#000]"
            >
              {t('settings.save')}
            </button>
            <button
              onClick={onClose}
              className="border-[3px] border-black bg-white px-6 py-3 font-bold tracking-wide text-black uppercase shadow-[4px_4px_0px_#000] transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]"
            >
              {t('settings.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
