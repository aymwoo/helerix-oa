import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../views/Login'
import { ToastProvider } from '../components/ToastContext'
import { UserRole, UserStatus, User } from '../types'

// Mock the db module
vi.mock('../db', () => ({
    UserDatabase: {
        initialize: vi.fn(() => Promise.resolve()),
        getAll: vi.fn(),
        add: vi.fn(),
    }
}))

// Mock constants
vi.mock('../constants', () => ({
    APP_LOGO: '/logo.png',
    AVATAR_ALEX: '/avatar.png',
}))

import { UserDatabase } from '../db'

describe('Login Component', () => {
    const mockOnLogin = vi.fn()
    
    const mockUsers: User[] = [
        {
            id: 'user-1',
            name: '陈老师',
            email: 'chen@example.com',
            password: 'password123',
            roles: [UserRole.Admin, UserRole.Math],
            department: '数学教研室',
            status: UserStatus.Active,
            avatarUrl: '/avatar.png',
        },
        {
            id: 'user-2', 
            name: '李老师',
            email: 'li@example.com',
            password: 'password123',
            roles: [UserRole.Chinese],
            department: '语文教研室',
            status: UserStatus.Active,
            avatarUrl: '/avatar.png',
        }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(UserDatabase.getAll).mockResolvedValue(mockUsers)
        // Set recent logins so they show up in Quick Login
        localStorage.setItem('helerix_recent_logins', JSON.stringify(['user-1', 'user-2']))
    })

    it('should render login page with logo', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByAltText('Helerix')).toBeInTheDocument()
        })
    })

    it('should show welcome message when users exist', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('欢迎回来')).toBeInTheDocument()
        })
    })

    it('should show registration form when no users exist', async () => {
        vi.mocked(UserDatabase.getAll).mockResolvedValue([])
        
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            // Title says '创建管理员账户' when no users exist
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('创建管理员账户')
        })
    })

    it('should display user list in quick login mode', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('陈老师')).toBeInTheDocument()
            expect(screen.getByText('李老师')).toBeInTheDocument()
        })
    })

    it('should show admin badge for admin users', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('管理员')).toBeInTheDocument()
        })
    })

    it('should call onLogin when user is clicked and password is provided', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('陈老师')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('陈老师'))
        
        // Should show password modal
        expect(screen.getByText('请输入登录密码')).toBeInTheDocument()
        
        // Enter password (default password in mock data is undefined, but component checks it)
        // Wait, what is the password in mock data? It's not there.
        // Let's assume it's '123456' for the sake of the test or update mock data.
        const passwordInput = screen.getByPlaceholderText('••••••••')
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(screen.getByText('确认登录'))
        
        expect(mockOnLogin).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }))
    })

    it('should switch to email login mode', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('账号登录')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('账号登录'))
        
        expect(screen.getByPlaceholderText('请输入邮箱或姓名')).toBeInTheDocument()
    })

    it('should login via email', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            fireEvent.click(screen.getByText('账号登录'))
        })
        
        const emailInput = screen.getByPlaceholderText('请输入邮箱或姓名')
        fireEvent.change(emailInput, { target: { value: 'chen@example.com' } })
        
        const passwordInput = screen.getByPlaceholderText('••••••••')
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        
        fireEvent.click(screen.getByText('登录系统'))
        
        expect(mockOnLogin).toHaveBeenCalledWith(mockUsers[0])
    })

    it('should show error for invalid email login', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            fireEvent.click(screen.getByText('账号登录'))
        })
        
        const emailInput = screen.getByPlaceholderText('请输入邮箱或姓名')
        fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } })
        
        fireEvent.click(screen.getByText('登录系统'))
        
        await waitFor(() => {
            expect(screen.getByText('未找到该邮箱或用户名对应的账户')).toBeInTheDocument()
        })
        expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('should switch to registration mode', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByText('立即注册 →')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('立即注册 →'))
        
        expect(screen.getByText('注册新账户')).toBeInTheDocument()
    })

    it('should validate registration fields', async () => {
        vi.mocked(UserDatabase.getAll).mockResolvedValue([])
        
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('创建管理员账户')
        })
        
        // Try to submit without filling fields - find button by looking for it
        const buttons = screen.getAllByRole('button')
        const submitButton = buttons.find(b => b.textContent?.includes('创建管理员账户'))
        if (submitButton) fireEvent.click(submitButton)
        
        await waitFor(() => {
            expect(screen.getByText('请输入姓名')).toBeInTheDocument()
        })
    })

    it('should register new user', async () => {
        vi.mocked(UserDatabase.getAll).mockResolvedValue([])
        vi.mocked(UserDatabase.add).mockResolvedValue([])
        
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('创建管理员账户')
        })
        
        // Fill registration form
        fireEvent.change(screen.getByPlaceholderText('请输入您的姓名'), { 
            target: { value: '新管理员' } 
        })
        fireEvent.change(screen.getByPlaceholderText('name@example.com'), { 
            target: { value: 'admin@test.com' } 
        })
        
        const passwordInputs = screen.getAllByPlaceholderText(/至少6位|再次输入/i)
        fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
        fireEvent.change(passwordInputs[1], { target: { value: 'password123' } })
        
        // Mock updated users list after registration
        const newUser: User = {
            id: 'new-user',
            name: '新管理员',
            email: 'admin@test.com',
            roles: [UserRole.Math, UserRole.Admin],
            department: '未分配',
            status: UserStatus.Active,
            avatarUrl: '/avatar.png',
        }
        vi.mocked(UserDatabase.getAll).mockResolvedValue([newUser])
        
        // Click the submit button
        const buttons = screen.getAllByRole('button')
        const submitButton = buttons.find(b => b.textContent?.includes('创建管理员账户'))
        if (submitButton) fireEvent.click(submitButton)
        
        await waitFor(() => {
            expect(UserDatabase.add).toHaveBeenCalled()
        })
    })

    it('should show first user becomes admin notice', async () => {
        vi.mocked(UserDatabase.getAll).mockResolvedValue([])
        
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            // Wait for loading to finish
            expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('创建管理员账户')
        })
        
        // Check for the admin notice
        expect(screen.getByText('首位注册用户将自动获得管理员权限')).toBeInTheDocument()
    })

    it('should display loading state initially', () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        // The component shows loading spinner before users are loaded
        // Title should be there since it's the default state wrap
        expect(screen.getByText('欢迎回来')).toBeInTheDocument()
    })

    it('should prevent duplicate email registration', async () => {
        render(<ToastProvider><Login onLogin={mockOnLogin} /></ToastProvider>)
        
        await waitFor(() => {
            fireEvent.click(screen.getByText('立即注册 →'))
        })
        
        fireEvent.change(screen.getByPlaceholderText('请输入您的姓名'), { 
            target: { value: '测试' } 
        })
        fireEvent.change(screen.getByPlaceholderText('name@example.com'), { 
            target: { value: 'chen@example.com' } // Existing email
        })
        
        fireEvent.click(screen.getByRole('button', { name: /注册账户/i }))
        
        await waitFor(() => {
            expect(screen.getByText('该邮箱已被注册')).toBeInTheDocument()
        })
    })
})
