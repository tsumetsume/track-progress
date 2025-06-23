import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { supabase } from '../lib/supabase'
import { Check, Square, Users, Clock, AlertCircle } from 'lucide-react'

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

export function StudentSession() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionCode = searchParams.get('session')
  
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [progress, setProgress] = useState<Progress[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tempName, setTempName] = useState('')
  const [wsConnectionError, setWsConnectionError] = useState(false)
  
  // Only initialize localStorage hooks when sessionCode is available
  const storageKeyPrefix = sessionCode || ''
  const [studentName, setStudentName] = useLocalStorage<string>(`student_name_${storageKeyPrefix}`, '')
  const [storedParticipantId, setStoredParticipantId] = useLocalStorage<string>(`participant_id_${storageKeyPrefix}`, '')

  useEffect(() => {
    if (sessionCode) {
      loadSession()
    } else {
      // Redirect to the join page if no session code is provided
      navigate('/join')
    }
  }, [sessionCode, navigate])

  useEffect(() => {
    if (participant && session) {
      loadTasks()
      loadProgress()
      
      // Update last seen periodically
      const interval = setInterval(updateLastSeen, 30000)
      
      // State to track if WebSockets are working and polling fallback
      let pollingIntervals: NodeJS.Timeout[] = []
      
      // Track reconnection attempts and active subscriptions
      let reconnectAttempts = 0
      let reconnectTimer: NodeJS.Timeout | null = null
      let activeSubscriptions: any[] = []
      
      // Helper function to handle subscription creation and error handling
      const createSubscription = (channelName: string, table: string, filter: string, callback: (payload: any) => void) => {
        console.log(`Creating subscription for ${channelName}`)
        try {
          // Use a shorter channel name to avoid potential issues
          const shortChannelName = `${table}_${Math.floor(Math.random() * 10000)}`
          return supabase
            .channel(shortChannelName, {
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
              callback(payload)
            })
            .subscribe((status) => {
              console.log(`Subscription status for ${channelName}:`, status)
              if (status === 'SUBSCRIBED') {
                console.log(`Successfully subscribed to ${channelName}`)
                // WebSocket connection successful
                // If this is a retry and was previously in error state, clear the error
                setWsConnectionError(false)
                // Reset reconnection attempts on successful connection
                reconnectAttempts = 0
                // Clear any pending reconnect timers
                if (reconnectTimer) {
                  clearTimeout(reconnectTimer)
                  reconnectTimer = null
                }
              } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                console.error(`Error with ${channelName}: ${status}`)
                // WebSocket connection failed
                
                // Set WebSocket connection error state
                setWsConnectionError(true)
                
                // Start polling as fallback if this is the first error
                if (pollingIntervals.length === 0) {
                  console.log('Starting polling fallback mechanism due to error')
                  setupPollingFallback()
                }
                
                // Implement exponential backoff for reconnection
                const maxReconnectAttempts = 5
                if (reconnectAttempts < maxReconnectAttempts) {
                  // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
                  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
                  console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1} in ${delay}ms`)
                  
                  // Clear any existing reconnect timer
                  if (reconnectTimer) {
                    clearTimeout(reconnectTimer)
                  }
                  
                  // Schedule reconnection attempt
                  reconnectTimer = setTimeout(() => {
                    console.log(`Attempting reconnection #${reconnectAttempts + 1}`)
                    // Attempt to reconnect by recreating subscriptions
                    attemptSubscriptions()
                    reconnectAttempts++
                  }, delay)
                }
              }
            })
        } catch (error) {
          console.error(`Error creating subscription for ${channelName}:`, error)
          // WebSocket connection failed - start polling if not already started
          setWsConnectionError(true)
          
          if (pollingIntervals.length === 0) {
            console.log('Starting polling fallback mechanism due to error')
            setupPollingFallback()
          }
          return null
        }
      }
      
      // Setup polling fallback when WebSockets fail
      const setupPollingFallback = () => {
        console.log('Setting up polling fallback for realtime updates')
        
        // Poll for tasks updates
        const tasksInterval = setInterval(() => {
          console.log('Polling for tasks updates')
          loadTasks()
        }, 5000) // Every 5 seconds
        
        // Poll for participant count
        const participantsInterval = setInterval(async () => {
          console.log('Polling for participants updates')
          const { data } = await supabase
            .from('participants')
            .select('id')
            .eq('session_id', session.id)
            .eq('is_online', true)
          
          setParticipantCount(data?.length || 0)
        }, 10000) // Every 10 seconds
        
        // Poll for progress updates
        const progressInterval = setInterval(() => {
          console.log('Polling for progress updates')
          loadProgress()
        }, 5000) // Every 5 seconds
        
        pollingIntervals = [tasksInterval, participantsInterval, progressInterval]
      }
      
      // Setup subscriptions with simpler channel names to avoid potential issues
      const attemptSubscriptions = () => {
        const tasksSubscription = createSubscription(
          'tasks',
          'tasks',
          `session_id=eq.${session.id}`,
          () => loadTasks()
        )

        // Subscribe to participants count
        const participantsSubscription = createSubscription(
          'participants',
          'participants',
          `session_id=eq.${session.id}`,
          async () => {
            const { data } = await supabase
              .from('participants')
              .select('id')
              .eq('session_id', session.id)
              .eq('is_online', true)
            
            setParticipantCount(data?.length || 0)
          }
        )
          
        // Subscribe to progress updates
        const progressSubscription = createSubscription(
          'progress',
          'progress',
          `participant_id=eq.${participant.id}`,
          () => loadProgress()
        )
        
        return { tasksSubscription, participantsSubscription, progressSubscription }
      }
      
      // Setup initial subscriptions
      activeSubscriptions = Object.values(attemptSubscriptions())
      
      // Setup a periodic health check for WebSocket connections
      const healthCheckInterval = setInterval(() => {
        // If we're in error state, try to reconnect
        if (wsConnectionError && reconnectAttempts < 5) {
          console.log('Health check detected connection issues, attempting reconnection')
          // Clean up existing subscriptions
          activeSubscriptions.forEach(subscription => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
              subscription.unsubscribe()
            }
          })
          
          // Create new subscriptions
          activeSubscriptions = Object.values(attemptSubscriptions())
        }
      }, 60000) // Check every minute
      
      return () => {
        // Cleanup
        clearInterval(interval)
        clearInterval(healthCheckInterval)
        if (reconnectTimer) clearTimeout(reconnectTimer)
        pollingIntervals.forEach(clearInterval)
        
        // Unsubscribe from all active subscriptions
        activeSubscriptions.forEach(subscription => {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            try {
              subscription.unsubscribe()
            } catch (e) {
              console.error('Error removing subscription:', e)
            }
          }
        })
      }
    }
  }, [participant, session])

  const loadSession = async () => {
    if (!sessionCode) return

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode)
        .single()

      if (error) throw error
      setSession(data)

      // Try to restore participant if stored
      if (sessionCode && studentName && storedParticipantId) {
        await restoreOrCreateParticipant(data.id)
      }
    } catch (error) {
      console.error('Error loading session:', error)
      setError('セッションが見つかりません')
    } finally {
      setLoading(false)
    }
  }

  const restoreOrCreateParticipant = async (sessionId: string) => {
    try {
      // Try to restore existing participant
      const { data: existingParticipant, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', storedParticipantId)
        .eq('session_id', sessionId)
        .single()

      if (!error && existingParticipant) {
        // Update existing participant
        const { data: updatedParticipant, error: updateError } = await supabase
          .from('participants')
          .update({ 
            is_online: true, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', storedParticipantId)
          .select()
          .single()

        if (!updateError) {
          setParticipant(updatedParticipant)
          return
        }
      }

      // Create new participant if restore failed
      await createNewParticipant(sessionId, studentName)
    } catch (error) {
      console.error('Error restoring participant:', error)
      await createNewParticipant(sessionId, studentName)
    }
  }

  const createNewParticipant = async (sessionId: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .insert([{
          session_id: sessionId,
          name,
          is_online: true,
          last_seen: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      setParticipant(data)
      setStoredParticipantId(data.id)
    } catch (error) {
      console.error('Error creating participant:', error)
      setError('参加者の登録に失敗しました')
    }
  }

  const joinSession = async () => {
    if (!tempName.trim() || !session) return

    setStudentName(tempName.trim())
    await createNewParticipant(session.id, tempName.trim())
  }

  const loadTasks = async () => {
    if (!session) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('session_id', session.id)
        .order('order_index')

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadProgress = async () => {
    if (!participant) return

    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('participant_id', participant.id)

      if (error) throw error
      setProgress(data || [])
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  // Removed subscribeToUpdates function as it's now handled directly in the useEffect

  const updateLastSeen = async () => {
    if (!participant) return

    try {
      await supabase
        .from('participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', participant.id)
    } catch (error) {
      console.error('Error updating last seen:', error)
    }
  }

  const toggleTaskProgress = async (taskId: string) => {
    if (!participant) return

    try {
      const existingProgress = progress.find(p => p.task_id === taskId)
      
      if (existingProgress) {
        // Update existing progress
        const { data, error } = await supabase
          .from('progress')
          .update({ 
            completed: !existingProgress.completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
          .select()
          .single()

        if (error) throw error
        
        // Update local state
        setProgress(progress.map(p => p.id === existingProgress.id ? data : p))
        
        // Log the update to ensure it triggers the realtime subscription
        console.log('Progress updated:', data)
      } else {
        // Create new progress entry
        const { data, error } = await supabase
          .from('progress')
          .insert([{
            participant_id: participant.id,
            task_id: taskId,
            completed: true,
            updated_at: new Date().toISOString() // Explicitly set updated_at
          }])
          .select()
          .single()

        if (error) throw error
        
        // Update local state
        setProgress([...progress, data])
        
        // Log the new progress entry
        console.log('New progress created:', data)
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const getTaskProgress = (taskId: string) => {
    const taskProgress = progress.find(p => p.task_id === taskId)
    return taskProgress?.completed || false
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">エラーが発生しました</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">セッションが見つかりません</h2>
            <p className="text-gray-600">指定されたセッションコードが無効です。</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!participant) {
    return (
      <Layout title={`${session.title} - 参加`}>
        <div className="max-w-md mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">セッションに参加</h2>
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{session.title}</h3>
              <p className="text-sm text-gray-600">セッションコード: {session.code}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  あなたの名前を入力してください
                </label>
                <input
                  type="text"
                  id="name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="山田 太郎"
                  onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                />
              </div>
              <button
                onClick={joinSession}
                disabled={!tempName.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                参加する
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Function to handle page reload
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <Layout title={`${session.title} - ${participant.name}`}>
      {/* WebSocket Connection Error Alert */}
      {wsConnectionError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>WebSocketの接続に失敗しました。データが最新ではない可能性があります。</span>
            </div>
            <button 
              onClick={handleReload}
              className="bg-white text-red-500 px-4 py-1 rounded-md font-medium hover:bg-red-50 transition-colors"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Session Info */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{session.title}</h2>
              <p className="text-gray-600">参加者: {participant.name}</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-green-600">
                <Users className="w-4 h-4" />
                <span className="font-medium">{participantCount}人参加中</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-sm">接続中</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">タスク一覧</h3>
          
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">まだタスクが追加されていません</p>
              <p className="text-sm text-gray-400">講師がタスクを追加するまでお待ちください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => {
                const isCompleted = getTaskProgress(task.id)
                
                return (
                  <div
                    key={task.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-md ${
                      isCompleted
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleTaskProgress(task.id)}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <p className={`font-medium ${
                        isCompleted ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {task.title}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <button
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isCompleted
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Progress Summary */}
        {tasks.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">進捗状況</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.filter(p => p.completed).length / tasks.length) * 100}%`
                  }}
                />
              </div>
              <span className="font-medium text-gray-900">
                {progress.filter(p => p.completed).length}/{tasks.length} 完了
              </span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}