import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SystemSettings from '../views/SystemSettings'
import { PromptDatabase } from '../db'
import { GoogleGenAI } from '@google/genai'
import * as Diff from 'diff'

// Mock external dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn()
}))

vi.mock('diff', () => ({
  diffLines: vi.fn()
}))

vi.mock('../db', () => ({
  PromptDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue([])
  },
  // Add other databases if used
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    readText: vi.fn(),
    writeText: vi.fn(),
  },
  writable: true,
})

// Mock fetch
global.fetch = vi.fn()

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PromptDatabase.getAll).mockResolvedValue([])
    vi.mocked(PromptDatabase.initialize).mockResolvedValue(undefined)
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => { })
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<SystemSettings />)
      expect(screen.getByText('系统设置')).toBeInTheDocument()
    })

    it('should display tab navigation', () => {
      render(<SystemSettings />)
      expect(screen.getByText('AI 模型配置')).toBeInTheDocument()
      expect(screen.getByText('提示词工程')).toBeInTheDocument()
      expect(screen.getByText('系统维护与备份')).toBeInTheDocument()
    })

    it('should show AI config tab by default', () => {
      render(<SystemSettings />)
      expect(screen.getByText('自定义 OpenAI 兼容网关')).toBeInTheDocument()
    })
  })

  describe('AI Config Tab', () => {
    it('should display custom providers section', () => {
      render(<SystemSettings />)
      expect(screen.getByText('自定义 OpenAI 兼容网关')).toBeInTheDocument()
      expect(screen.getByText('连接 Qwen、DeepSeek、Ollama 等兼容接口。')).toBeInTheDocument()
    })

    it('should load custom providers from localStorage', () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProviders))

      render(<SystemSettings />)
      // Should display the provider after loading
      expect(screen.getByText('Test Provider')).toBeInTheDocument()
    })

    it('should show empty state when no providers', () => {
      render(<SystemSettings />)
      expect(screen.getByText('暂无自定义提供商')).toBeInTheDocument()
    })

    it('should open add provider form when clicking add button', () => {
      render(<SystemSettings />)
      const addButton = screen.getByText('添加提供商')
      fireEvent.click(addButton)
      expect(screen.getByText('确认添加')).toBeInTheDocument()
    })

    it('should add custom provider', () => {
      render(<SystemSettings />)
      fireEvent.click(screen.getByText('添加提供商'))

      fireEvent.change(screen.getByPlaceholderText('例如: My Ollama Server'), { target: { value: 'Test Provider' } })
      fireEvent.change(screen.getByPlaceholderText('例如: https://api.myserver.com/v1'), { target: { value: 'http://test.com' } })
      fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'test-key' } })
      fireEvent.change(screen.getByPlaceholderText('例如: gpt-4-turbo, llama3:latest'), { target: { value: 'test-model' } })

      fireEvent.click(screen.getByText('确认添加'))

      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(screen.getByText('Test Provider')).toBeInTheDocument()
    })

    it('should delete custom provider', () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProviders))

      // Mock window.confirm
      window.confirm = vi.fn(() => true)

      render(<SystemSettings />)
      const deleteButton = screen.getByTitle('删除配置')
      fireEvent.click(deleteButton)

      expect(window.confirm).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should test custom connection', async () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockProviders))

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'OK' } }] }),
        } as any)
      )

      render(<SystemSettings />)
      const testButton = screen.getByTitle('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(screen.getByText('连接成功：API 响应正常')).toBeInTheDocument()
      })
    })
  })

  describe('Prompt Engineering Tab', () => {
    it('should switch to prompt engineering tab', () => {
      render(<SystemSettings />)
      fireEvent.click(screen.getByText('提示词工程'))
      expect(screen.getByText('版本历史')).toBeInTheDocument()
    })

    it('should display prompt categories', () => {
      render(<SystemSettings />)
      fireEvent.click(screen.getByText('提示词工程'))
      expect(screen.getByText('试卷分析')).toBeInTheDocument()
      expect(screen.getByText('专业档案识别')).toBeInTheDocument()
      expect(screen.getByText('方案批评者')).toBeInTheDocument()
    })
  })

  describe('System Maintenance Tab', () => {
    it('should switch to system maintenance tab', () => {
      render(<SystemSettings />)
      fireEvent.click(screen.getByText('系统维护与备份'))
      expect(screen.getByText('系统数据快照备份')).toBeInTheDocument()
    })

    it('should show backup section', () => {
      render(<SystemSettings />)
      fireEvent.click(screen.getByText('系统维护与备份'))
      expect(screen.getByText('导出数据备份')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle localStorage parse error', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      // Mock console.error to avoid noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      render(<SystemSettings />)
      expect(consoleSpy).toHaveBeenCalledWith("Failed to parse custom providers", expect.any(SyntaxError))

      consoleSpy.mockRestore()
    })

    it('should handle clipboard paste error', async () => {
      navigator.clipboard.readText = vi.fn(() => Promise.reject({ name: 'NotAllowedError', message: 'Clipboard error' }))

      render(<SystemSettings />)
      fireEvent.click(screen.getByText('粘贴导入'))

      await waitFor(() => {
        expect(screen.getByText('无法自动读取剪贴板，请手动粘贴内容到下方文本框。')).toBeInTheDocument()
      })
    })
  })
})