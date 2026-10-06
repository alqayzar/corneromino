import { HashRouter, Route, Routes } from 'react-router-dom'
import { Play } from '@/features/play/Play'
import { MainMenu } from '@/features/main-menu/MainMenu'
import { SavedGames } from '@/features/saved-games/SavedGames'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainMenu />} path="/" />
        <Route element={<Play />} path="/play" />
        <Route element={<SavedGames />} path="/saved" />
        <Route element={<MainMenu />} path="*" />
      </Routes>
    </HashRouter>
  )
}

export default App
