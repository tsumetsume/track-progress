import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Copy, 
  Check, 
  Users, 
  RotateCcw, 
  Trash2,
  Edit3
} from 'lucide-react'

interface Session {
  id: string
  code: string
  title: string
  created_at: string
  active: boolean
}

interface Task {
  id: string
  session_id: string
  title: string
  order_index: number
  created_at: string
}

interface Participant {
  id: string
  session_id: string
  name: string
  last_seen: string
  created_at: string
  is_online: boolean
}

interface Progress {
  id: string
  participant_id: string
  task_id: string
  completed: boolean
  updated_at: string
}

export function InstructorDashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      loadSessionData(selectedSession.id)
      subscribeToUpdates(selectedSession.id)
    }
  }, [selectedSession])

  const loadSessions = async () => {
    try {
      setError(null)
      console.log('Loading sessions...')
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Sessions loaded:', data)
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      setError('セッションの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    try {
      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index')

      if (tasksError) throw tasksError
      setTasks(tasksData || [])

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')

      if (participantsError) throw participantsError
      setParticipants(participantsData || [])

      // Load progress
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('*')
        .in('participant_id', (participantsData || []).map(p => p.id))

      if (progressError) throw progressError
      setProgress(progressData || [])
    } catch (error) {
      console.error('Error loading session data:', error)
    }
  }

  const subscribeToUpdates = (sessionId: string) => {
    // State to track if WebSockets are working
    let pollingIntervals: NodeJS.Timeout[] = []
    
    // Helper function to handle subscription errors and reconnection
    const createSubscription = (channelName: string, table: string, filter: string) => {
      console.log(`Creating subscription for ${channelName}`)
      try {
        return supabase
          .channel(channelName, {
            config: {
              broadcast: { self: true },
              presence: { key: '' }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            console.log(`Presence sync for ${channelName}`)
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter
          }, (payload) => {
            console.log(`Received update for ${table}:`, payload)
            loadSessionData(sessionId)
          })
          .subscribe((status) => {
            console.log(`Subscription status for ${channelName}:`, status)
            if (status === 'SUBSCRIBED') {
              console.log(`Successfully subscribed to ${channelName}`)
            } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
              console.error(`Error with ${channelName}: ${status}`)
              
              // Start polling as fallback if this is the first error
              if (pollingIntervals.length === 0) {
                console.log('Starting polling fallback mechanism')
                setupPollingFallback()
              }
            }
          })
      } catch (error) {
        console.error(`Error creating subscription for ${channelName}:`, error)
        return null
      }
    }
    
    // Setup polling fallback when WebSockets fail
    const setupPollingFallback = () => {
      console.log('Setting up polling fallback for realtime updates')
      
      // Poll for session data updates
      const dataInterval = setInterval(() => {
        console.log('Polling for session data updates')
        loadSessionData(sessionId)
      }, 5000) // Every 5 seconds
      
      pollingIntervals.push(dataInterval)
    }

    // Subscribe to participants changes with unique channel name to avoid conflicts
    const participantsSubscription = createSubscription(
      `participants_${sessionId}_${Date.now()}`,
      'participants',
      `session_id=eq.${sessionId}`
    )

    // Subscribe to progress changes
    const progressSubscription = createSubscription(
      `progress_${sessionId}_${Date.now()}`,
      'progress',
      `participant_id=in.(${participants.map(p => p.id).join(',')})`
    )

    // Subscribe to tasks changes
    const tasksSubscription = createSubscription(
      `tasks_${sessionId}_${Date.now()}`,
      'tasks',
      `session_id=eq.${sessionId}`
    )

    return () => {
      console.log('Cleaning up subscriptions and polling intervals')
      
      // Clear all polling intervals
      pollingIntervals.forEach(interval => clearInterval(interval))
      
      // Remove WebSocket channels with error handling
      if (participantsSubscription) {
        try {
          supabase.removeChannel(participantsSubscription)
        } catch (e) {
          console.error('Error removing participantsSubscription:', e)
        }
      }
      
      if (progressSubscription) {
        try {
          supabase.removeChannel(progressSubscription)
        } catch (e) {
          console.error('Error removing progressSubscription:', e)
        }
      }
      
      if (tasksSubscription) {
        try {
          supabase.removeChannel(tasksSubscription)
        } catch (e) {
          console.error('Error removing tasksSubscription:', e)
        }
      }
    }
  }

  const createSession = async () => {
    if (!newSessionTitle.trim()) {
      alert('セッション名を入力してください')
      return
    }

    setCreating(true)
    setError(null)

    try {
      console.log('Creating session with title:', newSessionTitle)
      
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      console.log('Generated code:', code)
      
      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          code,
          title: newSessionTitle.trim(),
          active: true
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      console.log('Session created successfully:', data)
      setSessions([data, ...sessions])
      setNewSessionTitle('')
      
      // Show success message
      alert(`セッションが作成されました！\nセッションコード: ${code}`)
      
    } catch (error) {
      console.error('Error creating session:', error)
      setError('セッションの作成に失敗しました: ' + (error as Error).message)
      alert('セッションの作成に失敗しました。もう一度お試しください。')
    } finally {
      setCreating(false)
    }
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !selectedSession) return

    try {
      const maxOrder = Math.max(...tasks.map(t => t.order_index), -1)
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          session_id: selectedSession.id,
          title: newTaskTitle,
          order_index: maxOrder + 1
        }])
        .select()
        .single()

      if (error) throw error
      setTasks([...tasks, data])
      setNewTaskTitle('')
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const updateTask = async (taskId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId)

      if (error) throw error
      setTasks(tasks.map(t => t.id === taskId ? { ...t, title } : t))
      setEditingTask(null)
      setEditTaskTitle('')
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const resetAllProgress = async () => {
    if (!selectedSession) return

    try {
      const participantIds = participants.map(p => p.id)
      const { error } = await supabase
        .from('progress')
        .delete()
        .in('participant_id', participantIds)

      if (error) throw error
      setProgress([])
    } catch (error) {
      console.error('Error resetting progress:', error)
    }
  }

  const copySessionUrl = (code: string) => {
    const url = `${window.location.origin}/student?session=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getParticipantProgress = (participantId: string) => {
    return progress.filter(p => p.participant_id === participantId)
  }

  const getTaskCompletion = (taskId: string) => {
    const completed = progress.filter(p => p.task_id === taskId && p.completed).length
    return { completed, total: participants.length }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('このセッションを削除してもよろしいですか？この操作は取り消せません。')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Delete the session
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // Update the UI
      setSessions(sessions.filter(s => s.id !== sessionId))
      
      // If the deleted session was selected, clear the selection
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setTasks([])
        setParticipants([])
        setProgress([])
      }
      
    } catch (error) {
      console.error('Error deleting session:', error)
      setError('セッションの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="講師ダッシュボード">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="講師ダッシュボード">
      <div className="space-y-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Session Creation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">新しいセッションを作成</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="セッション名を入力 (例: Python基礎 - 第1回)"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && !creating && createSession()}
              disabled={creating}
            />
            <button
              onClick={createSession}
              disabled={!newSessionTitle.trim() || creating}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {creating ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>作成中...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>作成</span>
                </>
              )}
            </button>
          </div>
          
          {/* Debug Info */}
          <div className="mt-4 text-xs text-gray-500">
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '設定済み' : '未設定'}</p>
            <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}</p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">セッション一覧</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">まだセッションがありません</p>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                    selectedSession?.id === session.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-600">コード: {session.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copySessionUrl(session.code)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        title="URLをコピー"
                      >
                        {copiedCode === session.code ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="セッションを削除"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                      <div className={`w-3 h-3 rounded-full ${session.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Session Details */}
        {selectedSession && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Tasks Management */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">タスク管理</h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="新しいタスクを入力"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <button
                  onClick={addTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    {editingTask === task.id ? (
                      <input
                        type="text"
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') updateTask(task.id, editTaskTitle)
                          if (e.key === 'Escape') setEditingTask(null)
                        }}
                        onBlur={() => updateTask(task.id, editTaskTitle)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1">{task.title}</span>
                    )}
                    <div className="flex items-center space-x-1">
                      <div className="text-xs text-gray-500">
                        {getTaskCompletion(task.id).completed}/{getTaskCompletion(task.id).total}
                      </div>
                      <button
                        onClick={() => {
                          setEditingTask(task.id)
                          setEditTaskTitle(task.title)
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {tasks.length > 0 && (
                <button
                  onClick={resetAllProgress}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>全進捗をリセット</span>
                </button>
              )}
            </div>

            {/* Progress Overview */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">進捗状況</h3>
                <div className="flex items-center space-x-2 text-green-600">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{participants.length}人参加中</span>
                </div>
              </div>

              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">まだ参加者がいません</p>
              ) : (
                <div className="space-y-4">
                  {participants.map((participant) => {
                    const participantProgress = getParticipantProgress(participant.id)
                    const completedTasks = participantProgress.filter(p => p.completed).length
                    
                    return (
                      <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${participant.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="font-medium">{participant.name}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {completedTasks}/{tasks.length} 完了
                          </span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {tasks.map((task) => {
                            const isCompleted = participantProgress.some(p => p.task_id === task.id && p.completed)
                            return (
                              <div
                                key={task.id}
                                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                                  isCompleted
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                                title={task.title}
                              >
                                {tasks.indexOf(task) + 1}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}