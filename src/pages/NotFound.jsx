import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n.jsx'
import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="max-w-prose">
      <h1 className="text-[28px]">{t('errors.notFound')}</h1>
      <p className="mt-2">{t('errors.notFoundBody')}</p>
      <Button as={Link} to="/" className="mt-4 no-underline">{t('app.home')}</Button>
    </div>
  )
}
