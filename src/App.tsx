import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { InstructorDashboard } from './pages/InstructorDashboard'
import { StudentJoin } from './pages/StudentJoin'
import { StudentSession } from './pages/StudentSession'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/instructor" element={<InstructorDashboard />} />
        <Route path="/student" element={<StudentSession />} />
        <Route path="/join" element={<StudentJoin />} />
      </Routes>
    </Router>
  )
}

export default App