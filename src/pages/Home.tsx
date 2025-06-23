import React from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Users, UserCheck, BookOpen, BarChart3 } from 'lucide-react'

export function Home() {
  return (
    <Layout>
      <div className="text-center max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Hands-On Progress
            <span className="block text-2xl md:text-3xl font-medium text-gray-600 mt-2">
              プログラミング授業進捗共有システム
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            講師と生徒がリアルタイムで授業の進捗を共有し、効率的なハンズオン学習をサポートします。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Link to="/instructor" className="group">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">講師として開始</h2>
              <p className="text-gray-600 mb-6">
                新しいセッションを作成し、タスクを管理して生徒の進捗をリアルタイムで確認できます。
              </p>
              <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
                <span>セッションを作成</span>
                <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                  <div className="w-2 h-2 bg-blue-600 rounded-full group-hover:bg-white transition-colors duration-300"></div>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/student" className="group">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">生徒として参加</h2>
              <p className="text-gray-600 mb-6">
                セッションコードを入力して参加し、タスクの完了状況を更新できます。
              </p>
              <div className="flex items-center justify-center space-x-2 text-green-600 font-medium">
                <span>セッションに参加</span>
                <div className="w-5 h-5 rounded-full border-2 border-green-600 flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                  <div className="w-2 h-2 bg-green-600 rounded-full group-hover:bg-white transition-colors duration-300"></div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">主な機能</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">タスク管理</h4>
              <p className="text-sm text-gray-600">講師がタスクを作成・編集し、順序を管理できます</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">リアルタイム進捗</h4>
              <p className="text-sm text-gray-600">生徒の進捗状況をリアルタイムで確認・同期</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">参加者管理</h4>
              <p className="text-sm text-gray-600">参加者の状態を確認し、全体の進捗を管理</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}