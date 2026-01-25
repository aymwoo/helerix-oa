import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UserList from '../views/UserList'
import { UserRole, UserStatus } from '../types'
import { UserDatabase } from '../db'
import { read, utils } from 'xlsx'

// Mock external dependencies
vi.mock('../db', () => ({
  UserDatabase: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn()
  }
}))

// Mock window methods
global.confirm = vi.fn()
global.alert = vi.fn()

// Mock File and FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  onload: null,
  readAsBinaryString: vi.fn(),
  readAsText: vi.fn()
}))

global.File = vi.fn()

describe('UserList', () => {
  const mockUsers = [
    {
      id: '1',
      name: '张三',
      email: 'zhang@example.com',
      roles: [UserRole.Math],
      department: '数学教研组',
      status: UserStatus.Active,
      avatarUrl: 'avatar1.png'
    },
    {
      id: '2',
      name: '李四',
      email: 'li@example.com',
      roles: [UserRole.English],
      department: '英语教研组',
      status: UserStatus.Offline,
      avatarUrl: 'avatar2.png'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    UserDatabase.getAll.mockResolvedValue(mockUsers)
    UserDatabase.initialize.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      render(<UserList onUserSelect={() => {}} />)
      expect(screen.getByText('教研员名录')).toBeInTheDocument()
    })

    it('should display users list', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
        expect(screen.getByText('李四')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      UserDatabase.getAll.mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<UserList onUserSelect={() => {}} />)
      expect(screen.getByText('正在载入教研员名录...')).toBeInTheDocument()
    })
  })

  describe('User Selection', () => {
    it('should call onUserSelect when clicking user row', async () => {
      const mockOnSelect = vi.fn()
      render(<UserList onUserSelect={mockOnSelect} />)
      await waitFor(() => screen.getByText('张三'))

      fireEvent.click(screen.getByText('张三').closest('tr')!)
      expect(mockOnSelect).toHaveBeenCalledWith('1')
    })

    it('should handle checkbox selection', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const checkboxes = screen.getAllByRole('checkbox')
      const firstCheckbox = checkboxes[1] // First user checkbox
      fireEvent.click(firstCheckbox)

      expect(firstCheckbox).toBeChecked()
    })

    it('should select all users when clicking select all', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(selectAllCheckbox)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.slice(1).forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })
  })

  describe('Sorting', () => {
    it('should sort by name when clicking name header', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const nameHeader = screen.getByText('教研员姓名')
      fireEvent.click(nameHeader)

      // Check if sort icon is present
      expect(screen.getByTestId('arrow_drop_up')).toBeInTheDocument()
    })
  })

  describe('Adding Users', () => {
    it('should open add user modal', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      fireEvent.click(screen.getByText('注册新教研员'))
      expect(screen.getByText('注册新成员')).toBeInTheDocument()
    })

    it('should add new user', async () => {
      UserDatabase.add.mockResolvedValue([...mockUsers, { id: '3', name: '王五', email: 'wang@example.com', roles: [UserRole.Math], department: '数学教研组', status: UserStatus.Active, avatarUrl: 'avatar3.png' }])

      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      fireEvent.click(screen.getByText('注册新教研员'))

      fireEvent.change(screen.getByPlaceholderText('例如：张老师'), { target: { value: '王五' } })
      fireEvent.change(screen.getByPlaceholderText('example@edu.com'), { target: { value: 'wang@example.com' } })
      fireEvent.change(screen.getByPlaceholderText('例如：中学英语组'), { target: { value: '数学教研组' } })

      // Select role
      const mathButton = screen.getByText(UserRole.Math)
      fireEvent.click(mathButton)

      fireEvent.click(screen.getByText('确认注册'))

      await waitFor(() => {
        expect(UserDatabase.add).toHaveBeenCalled()
      })
    })
  })

  describe('Editing Users', () => {
    it('should open edit modal when clicking edit button', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const editButtons = screen.getAllByTitle('编辑配置')
      fireEvent.click(editButtons[0])

      expect(screen.getByText('修改教研员配置')).toBeInTheDocument()
    })

    it('should update user', async () => {
      UserDatabase.update.mockResolvedValue(mockUsers)

      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const editButtons = screen.getAllByTitle('编辑配置')
      fireEvent.click(editButtons[0])

      fireEvent.change(screen.getByDisplayValue('张三'), { target: { value: '张三修改' } })
      fireEvent.click(screen.getByText('保存变更'))

      await waitFor(() => {
        expect(UserDatabase.update).toHaveBeenCalled()
      })
    })
  })

  describe('Deleting Users', () => {
    it('should delete user after confirmation', async () => {
      global.confirm.mockReturnValue(true)
      UserDatabase.delete.mockResolvedValue(mockUsers.slice(1))

      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const deleteButtons = screen.getAllByTitle('移除')
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(UserDatabase.delete).toHaveBeenCalledWith('1')
      })
    })

    it('should not delete user if not confirmed', async () => {
      global.confirm.mockReturnValue(false)

      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const deleteButtons = screen.getAllByTitle('移除')
      fireEvent.click(deleteButtons[0])

      expect(UserDatabase.delete).not.toHaveBeenCalled()
    })
  })

  describe('Bulk Import', () => {
    it('should open file dialog when clicking bulk import', async () => {
      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const importButton = screen.getByText('批量导入')
      const fileInput = screen.getByTestId('file-input') // Assuming we add data-testid
      const clickSpy = vi.spyOn(fileInput, 'click')

      fireEvent.click(importButton)
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should import users from Excel file', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            A1: { v: '姓名' },
            B1: { v: '邮箱' },
            C1: { v: '科室' },
            D1: { v: '负责学科(用分号分隔)' },
            E1: { v: '状态(在线/离线/未激活)' },
            A2: { v: '赵六' },
            B2: { v: 'zhao@example.com' },
            C2: { v: '物理教研组' },
            D2: { v: '物理教研员' },
            E2: { v: '在线' }
          }
        }
      }

      read.mockReturnValue(mockWorkbook)
      utils.sheet_to_json.mockReturnValue([
        ['赵六', 'zhao@example.com', '物理教研组', '物理教研员', '在线']
      ])

      UserDatabase.add.mockResolvedValue([])

      render(<UserList onUserSelect={() => {}} />)
      await waitFor(() => screen.getByText('张三'))

      const fileInput = screen.getByTestId('file-input')
      const mockFile = new File([''], 'test.xlsx')
      fireEvent.change(fileInput, { target: { files: [mockFile] } })

      // Mock FileReader
      const mockReader = new global.FileReader()
      mockReader.onload({ target: { result: 'mock data' } })

      await waitFor(() => {
        expect(UserDatabase.add).toHaveBeenCalled()
        expect(global.alert).toHaveBeenCalledWith('成功导入 1 名教研员')
      })
    })
  })

  describe('Template Download', () => {
    it('should download template when clicking template button', () => {
      const createElementSpy = vi.spyOn(document, 'createElement')
      const mockAnchor = { href: '', download: '', click: vi.fn() }
      createElementSpy.mockReturnValue(mockAnchor as any)

      render(<UserList onUserSelect={() => {}} />)

      fireEvent.click(screen.getByText('模板'))

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe('教研员导入模板.csv')
      expect(mockAnchor.click).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle database initialization error', async () => {
      UserDatabase.initialize.mockRejectedValue(new Error('DB error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<UserList onUserSelect={() => {}} />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('加载教研员数据失败:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should handle empty user list', async () => {
      UserDatabase.getAll.mockResolvedValue([])

      render(<UserList onUserSelect={() => {}} />)

      await waitFor(() => {
        expect(screen.getByText('暂无数据')).toBeInTheDocument() // Assuming there's such text
      })
    })
  })
})