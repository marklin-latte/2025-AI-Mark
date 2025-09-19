import { ref, onMounted, nextTick } from 'vue'
import { ChatAPI, APIError } from '../services/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function useChatRoom() {
  const chatAPI = new ChatAPI()
  const messages = ref<Message[]>([])
  const inputMessage = ref('')
  const isLoading = ref(false)
  const isConnected = ref(true)
  const currentResponse = ref('')
  const messagesContainer = ref<HTMLElement>()
  const inputRef = ref<HTMLInputElement>()

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    messages.value.push({
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    })
    scrollToBottom()
  }

  const scrollToBottom = () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const sendMessage = async () => {
    if (!inputMessage.value.trim() || isLoading.value) return

    const userMessage = inputMessage.value.trim()
    addMessage('user', userMessage)

    inputMessage.value = ''
    isLoading.value = true
    currentResponse.value = ''

    try {
      for await (const chunk of chatAPI.streamChat(userMessage)) {
        currentResponse.value += chunk
        scrollToBottom()
      }

      if (currentResponse.value) {
        addMessage('assistant', currentResponse.value)
      }
    } catch (error) {
      console.error('發送訊息錯誤:', error)
      
      let errorMessage = '抱歉，發生錯誤，請稍後再試。'
      
      if (error instanceof APIError) {
        switch (error.code) {
          case 'TIMEOUT':
            errorMessage = '請求超時，請檢查網路連線並重試。'
            break
          default:
            errorMessage = error.message || errorMessage
        }
        
        // 根據狀態碼決定是否設為離線
        if (error.status && error.status >= 500) {
          isConnected.value = false
          setTimeout(() => {
            isConnected.value = true
          }, 5000)
        }
      } else {
        // 其他類型的錯誤（如網路錯誤）
        isConnected.value = false
        setTimeout(() => {
          isConnected.value = true
        }, 3000)
      }
      
      addMessage('assistant', errorMessage)
    } finally {
      isLoading.value = false
      currentResponse.value = ''
      inputRef.value?.focus()
    }
  }

  const initialize = () => {
    inputRef.value?.focus()
    addMessage('assistant', '我是馬克大人的工具人，你要幹啥 ?')
  }

  onMounted(() => {
    initialize()
  })

  return {
    messages,
    inputMessage,
    isLoading,
    isConnected,
    currentResponse,
    messagesContainer,
    inputRef,
    addMessage,
    scrollToBottom,
    formatTime,
    sendMessage,
    initialize
  }
}