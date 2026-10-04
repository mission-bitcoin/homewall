import { NavLink, Route, Routes } from 'react-router-dom'
import WallPage from './pages/WallPage'
import ClimbListPage from './pages/ClimbListPage'
import ClimbEditorPage from './pages/ClimbEditorPage'
import ClimbViewPage from './pages/ClimbViewPage'
import { APP_VERSION } from './version'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          HomeWall <span className="version">{APP_VERSION}</span>
        </span>
        <nav>
          <NavLink to="/" end>
            Wall
          </NavLink>
          <NavLink to="/climbs">Climbs</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<WallPage />} />
          <Route path="/climbs" element={<ClimbListPage />} />
          <Route path="/climbs/new" element={<ClimbEditorPage />} />
          <Route path="/climbs/:id" element={<ClimbViewPage />} />
          <Route path="/climbs/:id/edit" element={<ClimbEditorPage />} />
        </Routes>
      </main>
    </div>
  )
}
