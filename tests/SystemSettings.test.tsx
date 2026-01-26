import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SystemSettings from '../views/SystemSettings'
import { PromptDatabase, AIProviderDatabase } from '../db'
import { ToastProvider } from '../components/ToastContext'
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
  AIProviderDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue([])
  },
  DatabaseManager: {
    exportDatabase: vi.fn().mockResolvedValue(new Uint8Array())
  }
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
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      readText: vi.fn(),
      writeText: vi.fn(),
    },
    writable: true,
    configurable: true
  })
}

// Mock fetch
global.fetch = vi.fn()

import { UserRole, UserStatus } from '../types'

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@test.com',
  roles: [UserRole.Admin],
  department: 'IT',
  status: UserStatus.Active,
  avatarUrl: ''
}

const mockNormalUser = {
  id: 'user-1',
  name: 'Normal User',
  email: 'user@test.com',
  roles: [UserRole.Math],
  department: 'Math',
  status: UserStatus.Active,
  avatarUrl: ''
}

describe('SystemSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PromptDatabase.getAll).mockResolvedValue([])
    vi.mocked(PromptDatabase.initialize).mockResolvedValue(undefined)
    vi.mocked(AIProviderDatabase.getAll).mockResolvedValue([])
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => { })
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      expect(screen.getByText('系统设置')).toBeInTheDocument()
    })

    it('should display tab navigation', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      expect(screen.getByText('AI 模型配置')).toBeInTheDocument()
      expect(screen.getByText('提示词工程')).toBeInTheDocument()
      expect(screen.getByText('系统维护与备份')).toBeInTheDocument()
    })

    it('should show AI config tab by default', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      expect(screen.getByText('自定义 OpenAI 兼容网关')).toBeInTheDocument()
    })
  })

  describe('AI Config Tab', () => {
    it('should display custom providers section', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      expect(screen.getByText('自定义 OpenAI 兼容网关')).toBeInTheDocument()
      expect(screen.getByText('连接 Qwen、DeepSeek、Ollama 等兼容接口。')).toBeInTheDocument()
    })

    it('should load custom providers from database', async () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      vi.mocked(AIProviderDatabase.getAll).mockResolvedValue(mockProviders)

      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      
      await waitFor(() => {
        expect(screen.getByText('Test Provider')).toBeInTheDocument()
      })
    })

    it('should show empty state when no providers', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      expect(screen.getByText('暂无自定义提供商')).toBeInTheDocument()
    })

    it('should open add provider form when clicking add button', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      const addButton = screen.getByText(/添加提供商/)
      fireEvent.click(addButton)
      expect(screen.getByText('确认添加')).toBeInTheDocument()
    })

    it('should add custom provider', async () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText(/添加提供商/))

      fireEvent.change(screen.getByPlaceholderText('例如: My Ollama Server'), { target: { value: 'Test Provider' } })
      fireEvent.change(screen.getByPlaceholderText('例如: https://api.myserver.com/v1'), { target: { value: 'http://test.com' } })
      fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'test-key' } })
      fireEvent.change(screen.getByPlaceholderText('例如: gpt-4-turbo, llama3:latest'), { target: { value: 'test-model' } })

      // Mock add to return new list
      vi.mocked(AIProviderDatabase.add).mockResolvedValue([{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'test-key', modelId: 'test-model' }])

      fireEvent.click(screen.getByText('确认添加'))

      await waitFor(() => {
        expect(AIProviderDatabase.add).toHaveBeenCalled()
        expect(screen.getByText('Test Provider')).toBeInTheDocument()
      })
    })

    it('should delete custom provider', async () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      vi.mocked(AIProviderDatabase.getAll).mockResolvedValue(mockProviders)
      vi.mocked(AIProviderDatabase.delete).mockResolvedValue([])

      // Mock window.confirm
      window.confirm = vi.fn(() => true)

      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      
      await waitFor(() => expect(screen.getByText('Test Provider')).toBeInTheDocument());

      const deleteButton = screen.getByTitle('删除配置')
      fireEvent.click(deleteButton)

      expect(window.confirm).toHaveBeenCalled()
      
      await waitFor(() => {
        expect(AIProviderDatabase.delete).toHaveBeenCalledWith('1')
      })
    })

    it('should test custom connection', async () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      vi.mocked(AIProviderDatabase.getAll).mockResolvedValue(mockProviders)

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'OK' } }] }),
        } as any)
      )

      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      
      await waitFor(() => expect(screen.getByText('Test Provider')).toBeInTheDocument())

      const testButton = screen.getByTitle('测试连接')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(screen.getByText('连接成功：API 响应正常')).toBeInTheDocument()
      })
    })
  })

  describe('Prompt Engineering Tab', () => {
    it('should switch to prompt engineering tab', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText('提示词工程'))
      expect(screen.getByText('版本历史')).toBeInTheDocument()
    })

    it('should display prompt categories', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText('提示词工程'))
      expect(screen.getByText('试卷分析')).toBeInTheDocument()
      expect(screen.getByText('证书识别')).toBeInTheDocument()
      expect(screen.getByText('方案批评者')).toBeInTheDocument()
    })
  })

  describe('System Maintenance Tab', () => {
    it('should switch to system maintenance tab', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText('系统维护与备份'))
      expect(screen.getByText('系统数据快照备份')).toBeInTheDocument()
    })

    it('should show backup section', () => {
      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText('系统维护与备份'))
      expect(screen.getByText('导出数据备份')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle database load error', async () => {
      vi.mocked(AIProviderDatabase.getAll).mockRejectedValue(new Error("DB Error"))

      // Mock console.error to avoid noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      
      await waitFor(() => {
         expect(consoleSpy).toHaveBeenCalledWith("Failed to load providers", expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should handle clipboard paste error', async () => {
      vi.mocked(navigator.clipboard.readText).mockRejectedValue({ name: 'NotAllowedError', message: 'Clipboard error' })

      render(<ToastProvider><SystemSettings currentUser={mockAdminUser} /></ToastProvider>)
      fireEvent.click(screen.getByText(/粘贴配置/))

      await waitFor(() => {
        expect(screen.getByText('无法自动读取剪贴板，请手动粘贴内容到下方文本框。')).toBeInTheDocument()
      })
    })
  })

  describe('Regular User Permissions', () => {
    it('should hide system maintenance tab for non-admin', () => {
      render(<ToastProvider><SystemSettings currentUser={mockNormalUser} /></ToastProvider>)
      expect(screen.queryByText('系统维护与备份')).not.toBeInTheDocument()
    })

    it('should hide modification buttons in AI Config for non-admin', async () => {
      const mockProviders = [{ id: '1', name: 'Test Provider', baseUrl: 'http://test.com', apiKey: 'key', modelId: 'model' }]
      vi.mocked(AIProviderDatabase.getAll).mockResolvedValue(mockProviders)

      render(<ToastProvider><SystemSettings currentUser={mockNormalUser} /></ToastProvider>)
      
      expect(screen.queryByText(/添加提供商/)).not.toBeInTheDocument()
      expect(screen.queryByText('导入配置')).not.toBeInTheDocument()
      expect(screen.queryByText('粘贴配置')).not.toBeInTheDocument()
      
      expect(screen.queryByTitle('编辑配置')).not.toBeInTheDocument()
      expect(screen.queryByTitle('删除配置')).not.toBeInTheDocument()
      
      // Connection test should still be visible
      await waitFor(() => {
        expect(screen.getByTitle('测试连接')).toBeInTheDocument()
      })
    })

    it('should still allow prompt engineering for non-admin', () => {
      render(<ToastProvider><SystemSettings currentUser={mockNormalUser} /></ToastProvider>)
      fireEvent.click(screen.getByText('提示词工程'))
      expect(screen.getByText('版本历史')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('在此输入系统指令...')).not.toBeDisabled()
    })
  })
})