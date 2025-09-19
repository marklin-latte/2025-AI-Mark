export interface APIConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ChatStreamResponse {
  chunk?: string;
  error?: string;
  done?: boolean;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ChatAPI {
  private config: APIConfig;

  constructor(config?: Partial<APIConfig>) {
    this.config = {
      baseUrl: 'http://localhost:3001/api',
      timeout: 30000, // 30秒超時
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }


  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('請求超時', 408, 'TIMEOUT');
      }
      throw error;
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.config.retryAttempts
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempts > 1 && this.shouldRetry(error)) {
        await this.delay(this.config.retryDelay);
        return this.withRetry(operation, attempts - 1);
      }
      throw error;
    }
  }

  /**
   * 判斷是否應該重試
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof APIError) {
      // 5xx 錯誤或網路錯誤才重試
      return error.status ? error.status >= 500 : false;
    }
    return error instanceof TypeError; // 網路錯誤
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 使用真正的 EventSource API 處理 SSE 連接
   */
  private createEventSource(url: string, options?: EventSourceInit): EventSource {
    return new EventSource(url, {
      withCredentials: false,
      ...options
    });
  }

  /**
   * 使用 EventSource 處理聊天流
   */
  private async *processWithEventSource(message: string): AsyncGenerator<string, void, unknown> {
    // 將消息編碼到 URL 參數中
    const encodedMessage = encodeURIComponent(message);
    const url = `${this.config.baseUrl}/chat?message=${encodedMessage}`;

    const eventSource = this.createEventSource(url);

    try {
      yield* this.createEventSourceGenerator(eventSource);
    } finally {
      eventSource.close();
    }
  }

  /**
   * 創建 EventSource 生成器
   */
  private async *createEventSourceGenerator(eventSource: EventSource): AsyncGenerator<string, void, unknown> {
    const messageQueue: string[] = [];
    let isCompleted = false;
    let error: Error | null = null;
    let resolveNext: (() => void) | null = null;

    // 設置事件監聽器
    eventSource.onopen = () => {
      console.log('EventSource 連接已建立');
    };

    eventSource.onmessage = (event) => {
      try {
        if (event.data === '[DONE]') {
          isCompleted = true;
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
          return;
        }

        const data = JSON.parse(event.data) as ChatStreamResponse;

        if (data.chunk) {
          messageQueue.push(data.chunk);
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        }

        if (data.error) {
          error = new APIError(data.error);
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
        }
      } catch (err) {
        console.warn('解析 EventSource 數據失敗:', err, '原始數據:', event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource 錯誤:', err);
      error = new APIError('EventSource 連接錯誤');
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    };

    // 設定超時
    const timeoutId = setTimeout(() => {
      if (eventSource.readyState !== EventSource.CLOSED) {
        error = new APIError('連接超時', 408, 'TIMEOUT');
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      }
    }, this.config.timeout);

    try {
      // 生成器主循環
      while (!isCompleted && !error) {
        if (messageQueue.length > 0) {
          yield messageQueue.shift()!;
        } else {
          // 等待新消息
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

      // 處理剩餘的消息
      while (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      }

      // 如果有錯誤，拋出它
      if (error) {
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }


  /**
   * 發送聊天消息並獲取流式響應 (使用 EventSource)
   */
  async *streamChat(message: string): AsyncGenerator<string, void, unknown> {
    if (!message.trim()) {
      throw new APIError('消息不能為空');
    }

    const operation = async () => {
      return this.processWithEventSource(message.trim());
    };

    const generator = await this.withRetry(operation);
    yield* generator;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}