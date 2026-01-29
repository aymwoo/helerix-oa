import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CertificateList from '../views/CertificateList'
import { UserRole, HonorLevel, CertificateCategory, UserStatus } from '../types'
import { ToastProvider } from '../components/ToastContext'
import { CertificateDatabase, UserDatabase, PromptDatabase, AIProviderDatabase } from '../db'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

// Mock external dependencies
vi.mock('../db', () => ({
  CertificateDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue([])
  },
  UserDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null)
  },
  PromptDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([])
  },
  AIProviderDatabase: {
    getAll: vi.fn().mockResolvedValue([])
  },
  FileManager: {
    saveFile: vi.fn().mockResolvedValue("file:///path/to/file"),
    getFile: vi.fn().mockResolvedValue({ data: "base64data", mimeType: "image/jpeg" })
  }
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn()
  },
  write: vi.fn().mockReturnValue(new Uint8Array())
}))

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        folder: vi.fn().mockReturnThis(),
        file: vi.fn().mockReturnThis(),
        generateAsync: vi.fn().mockResolvedValue(new Blob(['zip content']))
      }
    })
  }
})

vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}))

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: async () => new Blob(['fake image content'], { type: 'image/jpeg' })
}) as any

describe('CertificateExport', () => {
  const mockUser = {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    roles: [UserRole.Admin], // Admin can access all features
    department: 'Dept',
    status: UserStatus.Active,
    avatarUrl: ''
  }

  const mockCerts = [
    {
      id: 'cert1',
      name: 'Test Certificate 1',
      issuer: 'Test Issuer',
      issueDate: '2023-01-01',
      level: HonorLevel.National,
      category: CertificateCategory.Award,
      credentialUrl: 'http://example.com/cert1.jpg',
      hours: 10,
      timestamp: 1672531200000,
      userId: 'user1'
    },
    {
      id: 'cert2',
      name: 'Test Certificate 2',
      issuer: 'Test Issuer 2',
      issueDate: '2023-06-01',
      level: HonorLevel.Provincial,
      category: CertificateCategory.Project,
      credentialUrl: '',
      hours: 5,
      timestamp: 1685577600000,
      userId: 'user1'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(CertificateDatabase.getAll).mockResolvedValue(mockCerts)
    vi.mocked(UserDatabase.getById).mockResolvedValue(mockUser)
    vi.mocked(UserDatabase.getAll).mockResolvedValue([mockUser])
    
    // Set localStorage for logged in user
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'helerix_auth_user_id') return 'user1'
      return null
    })
  })

  it('should render export button', async () => {
    render(<ToastProvider><CertificateList onCertSelect={() => {}} /></ToastProvider>)
    await waitFor(() => expect(screen.getByText('统计导出')).toBeInTheDocument())
  })

  it('should open stats modal when clicking export button', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><CertificateList onCertSelect={() => {}} /></ToastProvider>)
    await waitFor(() => screen.getByText('统计导出'))
    
    await user.click(screen.getByText('统计导出'))
    expect(screen.getByText('证书统计导出')).toBeInTheDocument()
  })

  it('should trigger export and call JSZip and saveAs', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><CertificateList onCertSelect={() => {}} /></ToastProvider>)
    await waitFor(() => screen.getByText('统计导出'))
    
    // Open modal
    await user.click(screen.getByText('统计导出'))
    
    // Click Generate Excel
    await user.click(screen.getByText('生成 Excel'))
    
    await waitFor(() => {
      // Check if JSZip was instantiated
      expect(JSZip).toHaveBeenCalled()
      // Check if saveAs was called
      expect(saveAs).toHaveBeenCalled()
    })
    
    // Verify XLSX calls
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled()
    expect(XLSX.utils.book_new).toHaveBeenCalled()
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
    expect(XLSX.write).toHaveBeenCalled()
  })

  it('should filter certificates by date', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><CertificateList onCertSelect={() => {}} /></ToastProvider>)
    await waitFor(() => screen.getByText('统计导出'))
    
    // Open modal
    await user.click(screen.getByText('统计导出'))
    
    // Set date range to include only the second certificate (2023-06-01)
    // Range: 2023-05-01 to 2023-07-01
    const startDateInput = screen.getByTestId('stats-start-date')
    const endDateInput = screen.getByTestId('stats-end-date')

    // userEvent for date inputs usually requires valid date string YYYY-MM-DD
    await user.type(startDateInput, '2023-05-01')
    await user.type(endDateInput, '2023-07-01')

    // Click Export
    await user.click(screen.getByText('生成 Excel'))

    await waitFor(() => {
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled()
    })

    // Verify filter logic via mock calls
    // json_to_sheet is called with the data array. We can inspect the first argument.
    const exportData = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0]
    expect(exportData).toHaveLength(1)
    expect(exportData[0]['证书名称']).toBe('Test Certificate 2')
  })
  
  it('should batch export selected certificates', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><CertificateList onCertSelect={() => {}} /></ToastProvider>)
    await waitFor(() => screen.getByText('Test Certificate 1'))
    
    // Find checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    // Click the first certificate's checkbox (index 1, as 0 is select all)
    await user.click(checkboxes[1])
    
    // Check if batch action bar appears
    await waitFor(() => expect(screen.getByText('批量导出')).toBeInTheDocument())
    
    // Click batch export
    await user.click(screen.getByText('批量导出'))
    
    await waitFor(() => {
      // Should trigger export
      expect(JSZip).toHaveBeenCalled()
      expect(saveAs).toHaveBeenCalled()
    })
  })
})
