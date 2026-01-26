import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { ToastProvider } from '../components/ToastContext'
import { UserRole, UserStatus, User } from '../types'

// Mock all view components
vi.mock('../views/Schedule', () => ({ default: () => <div data-testid="schedule-view">Schedule</div> }))
vi.mock('../views/UserList', () => ({ default: () => <div data-testid="userlist-view">UserList</div> }))
vi.mock('../views/UserProfile', () => ({ default: () => <div data-testid="userprofile-view">UserProfile</div> }))
vi.mock('../views/CertificateList', () => ({ default: () => <div data-testid="certlist-view">CertificateList</div> }))
vi.mock('../views/CertificateDetail', () => ({ default: () => <div data-testid="certdetail-view">CertificateDetail</div> }))
vi.mock('../views/SystemSettings', () => ({ default: () => <div data-testid="settings-view">SystemSettings</div> }))
vi.mock('../views/AIExamAnalysis', () => ({ default: () => <div data-testid="exam-view">AIExamAnalysis</div> }))
vi.mock('../views/AICritic', () => ({ default: () => <div data-testid="critic-view">AICritic</div> }))
vi.mock('../views/MyProfile', () => ({ default: () => <div data-testid="myprofile-view">MyProfile</div> }))

// Mock Login component
vi.mock('../views/Login', () => ({
    default: ({ onLogin }: { onLogin: (user: User) => void }) => (
        <div data-testid="login-view">
            <button onClick={() => onLogin(mockAdminUser)}>Login as Admin</button>
            <button onClick={() => onLogin(mockRegularUser)}>Login as User</button>
        </div>
    )
}))

// Mock Sidebar
vi.mock('../components/Sidebar', () => ({
    default: ({ currentView, onNavigate, currentUser, onLogout }: any) => (
        <div data-testid="sidebar">
            <span data-testid="current-view">{currentView}</span>
            <span data-testid="current-user">{currentUser?.name}</span>
            <button onClick={() => onNavigate('schedule')}>Schedule</button>
            <button onClick={() => onNavigate('users')}>Users</button>
            <button onClick={() => onNavigate('system-settings')}>Settings</button>
            <button onClick={() => onLogout?.()}>Logout</button>
        </div>
    )
}))

// Mock database
vi.mock('../db', () => ({
    UserDatabase: {
        initialize: vi.fn(() => Promise.resolve()),
        getById: vi.fn(),
        getAll: vi.fn(() => Promise.resolve([]))
    }
}))

import { UserDatabase } from '../db'

const mockAdminUser: User = {
    id: 'admin-1',
    name: '管理员用户',
    email: 'admin@test.com',
    roles: [UserRole.Admin, UserRole.Math],
    department: '管理部',
    status: UserStatus.Active,
    avatarUrl: '/avatar.png',
}

const mockRegularUser: User = {
    id: 'user-1',
    name: '普通用户',
    email: 'user@test.com',
    roles: [UserRole.Chinese],
    department: '语文组',
    status: UserStatus.Active,
    avatarUrl: '/avatar.png',
}

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        vi.mocked(UserDatabase.getById).mockResolvedValue(null)
    })

    it('should show login page when not authenticated', async () => {
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('login-view')).toBeInTheDocument()
        })
    })

    it('should show main app after login', async () => {
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('login-view')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('Login as Admin'))
        
        await waitFor(() => {
            expect(screen.getByTestId('sidebar')).toBeInTheDocument()
            expect(screen.getByTestId('schedule-view')).toBeInTheDocument()
        })
    })

    it('should persist login in localStorage', async () => {
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            fireEvent.click(screen.getByText('Login as Admin'))
        })
        
        expect(localStorage.setItem).toHaveBeenCalledWith('helerix_auth_user_id', 'admin-1')
    })

    it('should restore session from localStorage', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('admin-1')
        vi.mocked(UserDatabase.getById).mockResolvedValue(mockAdminUser)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('sidebar')).toBeInTheDocument()
            expect(screen.getByTestId('current-user')).toHaveTextContent('管理员用户')
        })
    })

    it('should logout and show login page', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('admin-1')
        vi.mocked(UserDatabase.getById).mockResolvedValue(mockAdminUser)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('Logout'))
        
        await waitFor(() => {
            expect(screen.getByTestId('login-view')).toBeInTheDocument()
        })
        expect(localStorage.removeItem).toHaveBeenCalledWith('helerix_auth_user_id')
    })

    it('should navigate between views', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('admin-1')
        vi.mocked(UserDatabase.getById).mockResolvedValue(mockAdminUser)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('schedule-view')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('Users'))
        
        await waitFor(() => {
            expect(screen.getByTestId('userlist-view')).toBeInTheDocument()
        })
    })

    it('should block non-admin from system settings', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('user-1')
        vi.mocked(UserDatabase.getById).mockResolvedValue(mockRegularUser)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('Settings'))
        
        await waitFor(() => {
            expect(screen.getByText('权限不足：系统设置仅对管理员开放')).toBeInTheDocument()
        })
    })

    it('should allow admin to access system settings', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('admin-1')
        vi.mocked(UserDatabase.getById).mockResolvedValue(mockAdminUser)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        })
        
        fireEvent.click(screen.getByText('Settings'))
        
        await waitFor(() => {
            expect(screen.getByTestId('settings-view')).toBeInTheDocument()
        })
    })

    it('should clear stored user if not found in database', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('deleted-user')
        vi.mocked(UserDatabase.getById).mockResolvedValue(null)
        
        render(<ToastProvider><App /></ToastProvider>)
        
        await waitFor(() => {
            expect(screen.getByTestId('login-view')).toBeInTheDocument()
        })
        expect(localStorage.removeItem).toHaveBeenCalledWith('helerix_auth_user_id')
    })
})
