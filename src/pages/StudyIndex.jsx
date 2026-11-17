import { Navigate } from 'react-router-dom'
import { useStudy } from './StudyLayout.jsx'

const SLUGS = ['scope', 'chain', 'data', 'results']

/** Opening a study lands on its furthest completed step. */
export default function StudyIndex() {
  const { study, reachable } = useStudy()
  return <Navigate to={SLUGS[reachable - 1] || 'scope'} replace state={{ studyId: study.id }} />
}
