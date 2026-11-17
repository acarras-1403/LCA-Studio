import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import Banner from './components/Banner.jsx'
import Home from './pages/Home.jsx'
import NewStudy from './pages/NewStudy.jsx'
import StudyLayout from './pages/StudyLayout.jsx'
import Step1Scope from './pages/Step1Scope.jsx'
import Step2Chain from './pages/Step2Chain.jsx'
import Step3Data from './pages/Step3Data.jsx'
import Step4Results from './pages/Step4Results.jsx'
import StudyIndex from './pages/StudyIndex.jsx'
import NotFound from './pages/NotFound.jsx'
import { configError } from './lib/supabase.js'
import { useI18n } from './lib/i18n.jsx'

export default function App() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col bg-body">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-brand focus:bg-action focus:px-3 focus:py-2 focus:text-action-fg">
        {t('app.skipToContent')}
      </a>
      <Header />
      <Banner />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-7">
        {configError ? (
          <p role="alert" className="rounded-brand border border-action bg-surface px-4 py-3 font-semibold text-action">
            {configError}
          </p>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studies/new" element={<NewStudy />} />
            <Route path="/studies/:id" element={<StudyLayout />}>
              <Route index element={<StudyIndex />} />
              <Route path="scope" element={<Step1Scope />} />
              <Route path="chain" element={<Step2Chain />} />
              <Route path="data" element={<Step3Data />} />
              <Route path="results" element={<Step4Results />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14px] text-text-meta">
          <span>{t('app.name')} — {t('app.tagline')}</span>
          <span>{t('app.demoLabel')}</span>
        </div>
      </footer>
    </div>
  )
}
