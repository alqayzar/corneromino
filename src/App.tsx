import { HashRouter, Route, Routes } from 'react-router-dom'
import { Play } from '@/features/play/Play'
import { TetrominoList } from '@/features/tetromino-list/TetrominoList'
import { MainMenu } from '@/features/main-menu/MainMenu'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainMenu />} path="/" />
        <Route element={<TetrominoList />} path="/list" />
        <Route element={<Play />} path="/play" />
        <Route element={<MainMenu />} path="*" />
      </Routes>
    </HashRouter>
  )
}

export default App
