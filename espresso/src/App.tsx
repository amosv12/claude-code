import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import Beans from './screens/Beans'
import Brew from './screens/Brew'
import EquipmentScreen from './screens/Equipment'
import Shots from './screens/Shots'

export default function App() {
  return (
    <div className="min-h-full pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/brew" replace />} />
          <Route path="/brew" element={<Brew />} />
          <Route path="/shots" element={<Shots />} />
          <Route path="/beans" element={<Beans />} />
          <Route path="/equipment" element={<EquipmentScreen />} />
          <Route path="*" element={<Navigate to="/brew" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
