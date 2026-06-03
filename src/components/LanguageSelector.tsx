import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  isDarkMode?: boolean;
}

export const LanguageSelector = ({ isDarkMode = false }: LanguageSelectorProps) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
  ];

  return (
    <div className="flex items-center space-x-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`px-2 py-1 rounded-lg text-xs transition-colors ${
            i18n.language === lang.code
              ? isDarkMode
                ? 'bg-green-600 text-white'
                : 'bg-green-500 text-white'
              : isDarkMode
              ? 'bg-gray-700 text-gray-400 hover:text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};
