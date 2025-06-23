import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Users, ArrowRight } from 'lucide-react'

export function StudentJoin() {
  const [sessionCode, setSessionCode] = useState('')
  const navigate = useNavigate()

  const joinSession = () => {
    if (sessionCode.trim()) {
      navigate(`/student?session=${sessionCode.trim().toUpperCase()}`)
    }
  }

  return (
    <Layout title="セッションに参加">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">セッションに参加</h1>
          <p className="text-gray-600">
            講師から教えてもらったセッションコードを入力してください
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="space-y-6">
            <div>
              <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                セッションコード
              </label>
              <input
                type="text"
                id="sessionCode"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                placeholder="ABC123"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              />
              <p className="text-xs text-gray-500 mt-2">
                6文字の英数字コードを入力してください
              </p>
            </div>

            <button
              onClick={joinSession}
              disabled={sessionCode.length !== 6}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>参加する</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            セッションコードがわからない場合は、講師にお尋ねください
          </p>
        </div>
      </div>
    </Layout>
  )
}