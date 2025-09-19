<template>
  <div class="chat-room">
    <div class="chat-header">
      <h1>馬克大人工具人</h1>
      <div class="status" :class="{ online: isConnected }">
        {{ isConnected ? '已連線' : '未連線' }}
      </div>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-time">
          {{ formatTime(message.timestamp) }}
        </div>
      </div>
      
      <div v-if="isLoading" class="message assistant">
        <div class="message-content">
          {{ currentResponse }}
          <span class="typing-indicator">▊</span>
        </div>
      </div>
    </div>
    
    <div class="chat-input">
      <form @submit.prevent="sendMessage">
        <input 
          v-model="inputMessage"
          type="text"
          placeholder="輸入訊息..."
          :disabled="isLoading"
          ref="inputRef"
        />
        <button type="submit" :disabled="isLoading || !inputMessage.trim()">
          {{ isLoading ? '發送中...' : '發送' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatRoom } from '../composables/useChatRoom'

const {
  messages,
  inputMessage,
  isLoading,
  isConnected,
  currentResponse,
  messagesContainer,
  inputRef,
  formatTime,
  sendMessage
} = useChatRoom()
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: white;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #2563eb;
  color: white;
  border-bottom: 1px solid #e5e7eb;
}

.chat-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.2);
}

.status.online {
  background: #10b981;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message.user {
  align-self: flex-end;
  align-items: flex-end;
}

.message.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-content {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 0.25rem;
}

.message-time {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  padding: 0 0.5rem;
}

.typing-indicator {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.chat-input {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
}

.chat-input form {
  display: flex;
  gap: 0.75rem;
}

.chat-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  outline: none;
}

.chat-input input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.chat-input button {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #1d4ed8;
}

.chat-input button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>