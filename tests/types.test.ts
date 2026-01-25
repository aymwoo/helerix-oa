import { describe, it, expect } from 'vitest'
import {
    UserRole,
    UserStatus,
    HonorLevel,
    CertificateCategory,
    User,
    Certificate,
    Project,
    PromptTemplate,
    ScheduleEvent,
    CustomProvider,
    CriticMessage,
    CriticSession
} from '../types'

describe('Types - Enums', () => {
    describe('UserRole', () => {
        it('should have all defined roles', () => {
            expect(UserRole.Admin).toBe('系统管理员')
            expect(UserRole.Chinese).toBe('语文教研员')
            expect(UserRole.Math).toBe('数学教研员')
            expect(UserRole.English).toBe('英语教研员')
            expect(UserRole.Physics).toBe('物理教研员')
            expect(UserRole.Chemistry).toBe('化学教研员')
            expect(UserRole.Biology).toBe('生物教研员')
            expect(UserRole.History).toBe('历史教研员')
            expect(UserRole.Geography).toBe('地理教研员')
            expect(UserRole.Politics).toBe('道德与法治教研员')
            expect(UserRole.PE).toBe('体育教研员')
            expect(UserRole.Art).toBe('艺术教研员')
            expect(UserRole.IT).toBe('信息技术教研员')
        })

        it('should have correct number of roles', () => {
            expect(Object.keys(UserRole).length).toBe(13)
        })
    })

    describe('UserStatus', () => {
        it('should have all defined statuses', () => {
            expect(UserStatus.Active).toBe('在线')
            expect(UserStatus.Offline).toBe('离线')
            expect(UserStatus.Inactive).toBe('未激活')
        })
    })

    describe('HonorLevel', () => {
        it('should have all defined levels', () => {
            expect(HonorLevel.National).toBe('国家级')
            expect(HonorLevel.Provincial).toBe('省级')
            expect(HonorLevel.Municipal).toBe('市级')
            expect(HonorLevel.District).toBe('区县级')
            expect(HonorLevel.School).toBe('校级')
        })

        it('should have 5 levels', () => {
            expect(Object.keys(HonorLevel).length).toBe(5)
        })
    })

    describe('CertificateCategory', () => {
        it('should have all defined categories', () => {
            expect(CertificateCategory.Award).toBe('荣誉表彰')
            expect(CertificateCategory.Project).toBe('课题结项')
            expect(CertificateCategory.Training).toBe('培训结业')
            expect(CertificateCategory.Qualification).toBe('职称资格')
            expect(CertificateCategory.Other).toBe('其他成果')
        })
    })
})

describe('Types - Interfaces', () => {
    describe('User', () => {
        it('should allow creating a valid user object', () => {
            const user: User = {
                id: '1',
                name: '测试用户',
                email: 'test@example.com',
                roles: [UserRole.Math],
                department: '数学教研室',
                status: UserStatus.Active,
                avatarUrl: 'https://example.com/avatar.png',
                bio: '这是简介',
                phone: '13800138000',
                joinDate: '2024-01-01',
                expertise: ['代数', '几何']
            }

            expect(user.id).toBe('1')
            expect(user.name).toBe('测试用户')
            expect(user.roles).toContain(UserRole.Math)
            expect(user.status).toBe(UserStatus.Active)
        })

        it('should allow optional fields to be undefined', () => {
            const user: User = {
                id: '2',
                name: '最小用户',
                email: 'minimal@example.com',
                roles: [UserRole.Admin],
                department: '管理部门',
                status: UserStatus.Offline,
                avatarUrl: ''
            }

            expect(user.bio).toBeUndefined()
            expect(user.phone).toBeUndefined()
            expect(user.joinDate).toBeUndefined()
            expect(user.expertise).toBeUndefined()
        })
    })

    describe('Certificate', () => {
        it('should allow creating a valid certificate', () => {
            const cert: Certificate = {
                id: 'cert-1',
                name: '优秀教师奖',
                issuer: '教育部',
                issueDate: '2024-06-01',
                level: HonorLevel.National,
                category: CertificateCategory.Award,
                credentialUrl: 'https://verify.edu.cn/cert/123',
                hours: 0,
                timestamp: Date.now()
            }

            expect(cert.level).toBe(HonorLevel.National)
            expect(cert.category).toBe(CertificateCategory.Award)
        })

        it('should allow training certificates with hours', () => {
            const trainingCert: Certificate = {
                id: 'cert-2',
                name: 'AI 教学培训',
                issuer: '教师进修学院',
                issueDate: '2024-03-15',
                level: HonorLevel.Provincial,
                category: CertificateCategory.Training,
                hours: 40,
                timestamp: Date.now()
            }

            expect(trainingCert.hours).toBe(40)
            expect(trainingCert.category).toBe(CertificateCategory.Training)
        })
    })

    describe('Project', () => {
        it('should allow creating a valid project', () => {
            const project: Project = {
                id: 'proj-1',
                name: '新课标研究项目',
                deadline: '2024-12-31',
                progress: 75,
                team: ['avatar1.png', 'avatar2.png'],
                extraTeamCount: 3,
                color: 'primary'
            }

            expect(project.progress).toBe(75)
            expect(project.color).toBe('primary')
            expect(project.team.length).toBe(2)
        })
    })

    describe('PromptTemplate', () => {
        it('should allow different categories', () => {
            const examPrompt: PromptTemplate = {
                id: 'prompt-1',
                name: '试卷分析提示词',
                content: '请分析这份试卷...',
                isDefault: true,
                timestamp: Date.now(),
                category: 'exam'
            }

            const certPrompt: PromptTemplate = {
                id: 'prompt-2',
                name: '证书识别提示词',
                content: '请识别证书信息...',
                isDefault: false,
                timestamp: Date.now(),
                category: 'certificate'
            }

            const criticPrompt: PromptTemplate = {
                id: 'prompt-3',
                name: '批评者提示词',
                content: '请批评这个方案...',
                isDefault: false,
                timestamp: Date.now(),
                category: 'critic'
            }

            expect(examPrompt.category).toBe('exam')
            expect(certPrompt.category).toBe('certificate')
            expect(criticPrompt.category).toBe('critic')
        })
    })

    describe('ScheduleEvent', () => {
        it('should allow creating schedule events', () => {
            const event: ScheduleEvent = {
                id: 'event-1',
                title: '教研会议',
                date: '2024-06-15',
                startTime: '09:00',
                endTime: '11:00',
                type: 'meeting',
                description: '讨论新课标实施',
                participants: ['张老师', '李老师']
            }

            expect(event.startTime).toBe('09:00')
            expect(event.participants?.length).toBe(2)
        })
    })

    describe('CustomProvider', () => {
        it('should allow creating AI provider config', () => {
            const provider: CustomProvider = {
                id: 'provider-1',
                name: 'Qwen',
                baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                apiKey: 'sk-xxx',
                modelId: 'qwen-turbo'
            }

            expect(provider.baseUrl).toContain('aliyuncs.com')
            expect(provider.modelId).toBe('qwen-turbo')
        })
    })

    describe('CriticMessage', () => {
        it('should allow user and model roles', () => {
            const userMsg: CriticMessage = {
                id: 'msg-1',
                role: 'user',
                text: '请评价这个方案',
                attachments: [{ type: 'image', data: 'base64...', name: 'doc.png' }]
            }

            const modelMsg: CriticMessage = {
                id: 'msg-2',
                role: 'model',
                text: '这个方案存在以下问题...'
            }

            expect(userMsg.role).toBe('user')
            expect(modelMsg.role).toBe('model')
            expect(userMsg.attachments?.length).toBe(1)
        })
    })

    describe('CriticSession', () => {
        it('should contain messages array', () => {
            const session: CriticSession = {
                id: 'session-1',
                title: '方案批评记录',
                timestamp: Date.now(),
                messages: [
                    { id: 'msg-1', role: 'user', text: '测试' },
                    { id: 'msg-2', role: 'model', text: '回复' }
                ]
            }

            expect(session.messages.length).toBe(2)
        })
    })
})
