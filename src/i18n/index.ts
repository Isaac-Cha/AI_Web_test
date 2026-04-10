import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 获取本地缓存的语言设置，默认 zh-CN
const savedLanguage = localStorage.getItem('app-language') || 'zh-CN'

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false, // React 已经自带防 XSS
    },
  })

// 监听语言切换并保存到本地
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng)
})

export default i18n
