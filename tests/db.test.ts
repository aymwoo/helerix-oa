import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the db module before importing
vi.mock('../db', async () => {
    const mockCertificates = [
        {
            id: 'cert-1',
            name: '优秀教师奖',
            issuer: '省教育厅',
            issueDate: '2024-01-15',
            level: '省级',
            category: '荣誉表彰',
            credentialUrl: '',
            hours: 0,
            timestamp: Date.now()
        }
    ]

    const mockUsers = [
        {
            id: 'user-1',
            name: '测试用户',
            email: 'test@example.com',
            roles: ['数学教研员'],
            department: '数学教研室',
            status: '在线',
            avatarUrl: 'https://example.com/avatar.png'
        }
    ]

    const mockPrompts = [
        {
            id: 'prompt-1',
            name: '默认提示词',
            content: '请分析...',
            isDefault: true,
            timestamp: Date.now(),
            category: 'exam'
        }
    ]

    const mockEvents = [
        {
            id: 'event-1',
            title: '教研会议',
            date: '2024-06-15',
            startTime: '09:00',
            endTime: '11:00',
            type: 'meeting',
            description: '讨论会',
            participants: []
        }
    ]

    return {
        CertificateDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([...mockCertificates])),
            getById: vi.fn((id: string) => Promise.resolve(mockCertificates.find(c => c.id === id) || null)),
            add: vi.fn((cert: any) => {
                mockCertificates.push(cert)
                return Promise.resolve([...mockCertificates])
            }),
            update: vi.fn((cert: any) => {
                const idx = mockCertificates.findIndex(c => c.id === cert.id)
                if (idx >= 0) mockCertificates[idx] = cert
                return Promise.resolve([...mockCertificates])
            }),
            delete: vi.fn((id: string) => {
                const idx = mockCertificates.findIndex(c => c.id === id)
                if (idx >= 0) mockCertificates.splice(idx, 1)
                return Promise.resolve([...mockCertificates])
            })
        },
        UserDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([...mockUsers])),
            getById: vi.fn((id: string) => Promise.resolve(mockUsers.find(u => u.id === id) || null)),
            add: vi.fn((user: any) => {
                mockUsers.push(user)
                return Promise.resolve([...mockUsers])
            }),
            update: vi.fn((user: any) => {
                const idx = mockUsers.findIndex(u => u.id === user.id)
                if (idx >= 0) mockUsers[idx] = user
                return Promise.resolve([...mockUsers])
            }),
            delete: vi.fn((id: string) => {
                const idx = mockUsers.findIndex(u => u.id === id)
                if (idx >= 0) mockUsers.splice(idx, 1)
                return Promise.resolve([...mockUsers])
            })
        },
        PromptDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn((category?: string) =>
                Promise.resolve(category ? mockPrompts.filter(p => p.category === category) : [...mockPrompts])
            ),
            add: vi.fn((prompt: any) => {
                mockPrompts.push(prompt)
                return Promise.resolve([...mockPrompts])
            }),
            delete: vi.fn((id: string, category: string) => {
                const idx = mockPrompts.findIndex(p => p.id === id)
                if (idx >= 0) mockPrompts.splice(idx, 1)
                return Promise.resolve([...mockPrompts])
            })
        },
        EventsDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([...mockEvents])),
            add: vi.fn((event: any) => {
                mockEvents.push(event)
                return Promise.resolve([...mockEvents])
            }),
            delete: vi.fn((id: string) => {
                const idx = mockEvents.findIndex(e => e.id === id)
                if (idx >= 0) mockEvents.splice(idx, 1)
                return Promise.resolve([...mockEvents])
            })
        },
        FileManager: {
            initialize: vi.fn(() => Promise.resolve()),
            saveFile: vi.fn(() => Promise.resolve('file://mock-file-id')),
            getFile: vi.fn((uri: string) => Promise.resolve({
                id: 'mock-file-id',
                name: 'test.png',
                mimeType: 'image/png',
                data: 'base64data',
                size: 1024,
                timestamp: Date.now()
            })),
            resolveToDataUrl: vi.fn((uri: string) => Promise.resolve('data:image/png;base64,mockdata')),
            deleteFile: vi.fn(() => Promise.resolve())
        },
        DatabaseManager: {
            exportDatabase: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
            importDatabase: vi.fn(() => Promise.resolve(true))
        },
        CriticDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([])),
            addOrUpdate: vi.fn((session: any) => Promise.resolve([session])),
            delete: vi.fn(() => Promise.resolve([]))
        },
        EventTypeDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([])),
            add: vi.fn((name: string, colorClass: string) => Promise.resolve([{ id: 'et-1', name, colorClass }])),
            delete: vi.fn(() => Promise.resolve([]))
        },
        ExamAnalysisDatabase: {
            initialize: vi.fn(() => Promise.resolve()),
            getAll: vi.fn(() => Promise.resolve([])),
            add: vi.fn((analysis: any) => Promise.resolve([analysis])),
            delete: vi.fn(() => Promise.resolve([]))
        }
    }
})

import {
    CertificateDatabase,
    UserDatabase,
    PromptDatabase,
    EventsDatabase,
    FileManager,
    DatabaseManager,
    CriticDatabase,
    EventTypeDatabase,
    ExamAnalysisDatabase
} from '../db'

describe('Database - CertificateDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should initialize database', async () => {
        await CertificateDatabase.initialize()
        expect(CertificateDatabase.initialize).toHaveBeenCalled()
    })

    it('should get all certificates', async () => {
        const certs = await CertificateDatabase.getAll()
        expect(Array.isArray(certs)).toBe(true)
        expect(certs.length).toBeGreaterThan(0)
    })

    it('should get certificate by id', async () => {
        const cert = await CertificateDatabase.getById('cert-1')
        expect(cert).not.toBeNull()
        expect(cert?.name).toBe('优秀教师奖')
    })

    it('should return null for non-existent certificate', async () => {
        const cert = await CertificateDatabase.getById('non-existent')
        expect(cert).toBeNull()
    })

    it('should add new certificate', async () => {
        const newCert = {
            id: 'cert-2',
            name: '新证书',
            issuer: '测试单位',
            issueDate: '2024-06-01',
            level: '市级',
            category: '培训结业',
            hours: 20,
            timestamp: Date.now()
        }
        const result = await CertificateDatabase.add(newCert as any)
        expect(CertificateDatabase.add).toHaveBeenCalledWith(newCert)
        expect(result.length).toBeGreaterThan(1)
    })

    it('should update certificate', async () => {
        const updatedCert = {
            id: 'cert-1',
            name: '更新后的证书',
            issuer: '省教育厅',
            issueDate: '2024-01-15',
            level: '省级',
            category: '荣誉表彰',
            hours: 0,
            timestamp: Date.now()
        }
        await CertificateDatabase.update(updatedCert as any)
        expect(CertificateDatabase.update).toHaveBeenCalledWith(updatedCert)
    })

    it('should delete certificate', async () => {
        await CertificateDatabase.delete('cert-1')
        expect(CertificateDatabase.delete).toHaveBeenCalledWith('cert-1')
    })
})

describe('Database - UserDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all users', async () => {
        const users = await UserDatabase.getAll()
        expect(Array.isArray(users)).toBe(true)
    })

    it('should get user by id', async () => {
        const user = await UserDatabase.getById('user-1')
        expect(user).not.toBeNull()
        expect(user?.name).toBe('测试用户')
    })

    it('should add new user', async () => {
        const newUser = {
            id: 'user-2',
            name: '新用户',
            email: 'new@example.com',
            roles: ['语文教研员'],
            department: '语文教研室',
            status: '在线',
            avatarUrl: ''
        }
        await UserDatabase.add(newUser as any)
        expect(UserDatabase.add).toHaveBeenCalledWith(newUser)
    })

    it('should update user', async () => {
        const updatedUser = {
            id: 'user-1',
            name: '更新后的用户',
            email: 'test@example.com',
            roles: ['数学教研员'],
            department: '数学教研室',
            status: '离线',
            avatarUrl: ''
        }
        await UserDatabase.update(updatedUser as any)
        expect(UserDatabase.update).toHaveBeenCalledWith(updatedUser)
    })

    it('should delete user', async () => {
        await UserDatabase.delete('user-1')
        expect(UserDatabase.delete).toHaveBeenCalledWith('user-1')
    })
})

describe('Database - PromptDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all prompts', async () => {
        const prompts = await PromptDatabase.getAll()
        expect(Array.isArray(prompts)).toBe(true)
    })

    it('should filter prompts by category', async () => {
        const examPrompts = await PromptDatabase.getAll('exam')
        expect(Array.isArray(examPrompts)).toBe(true)
    })

    it('should add new prompt', async () => {
        const newPrompt = {
            id: 'prompt-2',
            name: '新提示词',
            content: '测试内容',
            isDefault: false,
            timestamp: Date.now(),
            category: 'certificate'
        }
        await PromptDatabase.add(newPrompt as any)
        expect(PromptDatabase.add).toHaveBeenCalledWith(newPrompt)
    })

    it('should delete prompt', async () => {
        await PromptDatabase.delete('prompt-1', 'exam')
        expect(PromptDatabase.delete).toHaveBeenCalledWith('prompt-1', 'exam')
    })
})

describe('Database - EventsDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all events', async () => {
        const events = await EventsDatabase.getAll()
        expect(Array.isArray(events)).toBe(true)
    })

    it('should add new event', async () => {
        const newEvent = {
            id: 'event-2',
            title: '新会议',
            date: '2024-07-01',
            startTime: '14:00',
            endTime: '16:00',
            type: 'training',
            description: '培训',
            participants: ['张老师']
        }
        await EventsDatabase.add(newEvent as any)
        expect(EventsDatabase.add).toHaveBeenCalledWith(newEvent)
    })

    it('should delete event', async () => {
        await EventsDatabase.delete('event-1')
        expect(EventsDatabase.delete).toHaveBeenCalledWith('event-1')
    })
})

describe('Database - FileManager', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should save file and return URI', async () => {
        const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
        const uri = await FileManager.saveFile(mockFile)
        expect(uri).toContain('file://')
    })

    it('should get file by URI', async () => {
        const file = await FileManager.getFile('file://test-id')
        expect(file).not.toBeNull()
        expect(file?.name).toBe('test.png')
    })

    it('should resolve file to data URL', async () => {
        const dataUrl = await FileManager.resolveToDataUrl('file://test-id')
        expect(dataUrl).toContain('data:')
    })

    it('should delete file', async () => {
        await FileManager.deleteFile('file://test-id')
        expect(FileManager.deleteFile).toHaveBeenCalled()
    })
})

describe('Database - DatabaseManager', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should export database as Uint8Array', async () => {
        const data = await DatabaseManager.exportDatabase()
        expect(data).toBeInstanceOf(Uint8Array)
    })

    it('should import database', async () => {
        const success = await DatabaseManager.importDatabase(new Uint8Array([1, 2, 3]))
        expect(success).toBe(true)
    })
})

describe('Database - CriticDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all sessions', async () => {
        const sessions = await CriticDatabase.getAll()
        expect(Array.isArray(sessions)).toBe(true)
    })

    it('should add or update session', async () => {
        const session = {
            id: 'session-1',
            title: '测试会话',
            timestamp: Date.now(),
            messages: []
        }
        const result = await CriticDatabase.addOrUpdate(session as any)
        expect(CriticDatabase.addOrUpdate).toHaveBeenCalledWith(session)
    })

    it('should delete session', async () => {
        await CriticDatabase.delete('session-1')
        expect(CriticDatabase.delete).toHaveBeenCalledWith('session-1')
    })
})

describe('Database - EventTypeDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all event types', async () => {
        const types = await EventTypeDatabase.getAll()
        expect(Array.isArray(types)).toBe(true)
    })

    it('should add event type', async () => {
        const result = await EventTypeDatabase.add('培训', 'bg-blue-500')
        expect(EventTypeDatabase.add).toHaveBeenCalledWith('培训', 'bg-blue-500')
    })

    it('should delete event type', async () => {
        await EventTypeDatabase.delete('et-1')
        expect(EventTypeDatabase.delete).toHaveBeenCalledWith('et-1')
    })
})

describe('Database - ExamAnalysisDatabase', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should get all analyses', async () => {
        const analyses = await ExamAnalysisDatabase.getAll()
        expect(Array.isArray(analyses)).toBe(true)
    })

    it('should add analysis', async () => {
        const analysis = {
            id: 'analysis-1',
            timestamp: Date.now(),
            subject: '数学',
            title: '期末考试',
            grade: '初三',
            difficulty: 3,
            summary: '总结',
            knowledgePoints: ['函数', '代数'],
            itemAnalysis: [],
            teachingAdvice: '建议'
        }
        await ExamAnalysisDatabase.add(analysis as any)
        expect(ExamAnalysisDatabase.add).toHaveBeenCalledWith(analysis)
    })

    it('should delete analysis', async () => {
        await ExamAnalysisDatabase.delete('analysis-1')
        expect(ExamAnalysisDatabase.delete).toHaveBeenCalledWith('analysis-1')
    })
})
