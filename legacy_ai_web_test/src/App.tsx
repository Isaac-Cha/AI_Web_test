import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import SiteLayout from '@/components/SiteLayout'
import Home from '@/pages/Home'
import Platform from '@/pages/Platform'
import EA from '@/pages/EA'
import Metrics from '@/pages/Metrics'
import Learn from '@/pages/Learn'
import Join from '@/pages/Join'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/ea" element={<EA />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/join" element={<Join />} />
        </Route>
      </Routes>
    </Router>
  )
}
