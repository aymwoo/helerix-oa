import { describe, it, expect } from 'vitest'
import {
    AVATAR_ALEX,
    AVATAR_ALICE,
    AVATAR_MARCUS,
    AVATAR_SARAH,
    AVATAR_DAVID,
    AVATAR_EMILY,
    APP_LOGO,
    MOCK_USERS,
    MOCK_PROJECTS
} from '../constants'
import { UserRole, UserStatus } from '../types'

describe('Constants - Avatars', () => {
    it('should have valid avatar URLs', () => {
        expect(AVATAR_ALEX).toContain('lh3.googleusercontent.com')
        expect(AVATAR_ALICE).toContain('lh3.googleusercontent.com')
        expect(AVATAR_MARCUS).toContain('lh3.googleusercontent.com')
        expect(AVATAR_SARAH).toContain('lh3.googleusercontent.com')
        expect(AVATAR_DAVID).toContain('lh3.googleusercontent.com')
        expect(AVATAR_EMILY).toContain('lh3.googleusercontent.com')
    })

    it('should have unique avatar URLs', () => {
        const avatars = [AVATAR_ALEX, AVATAR_ALICE, AVATAR_MARCUS, AVATAR_SARAH, AVATAR_DAVID, AVATAR_EMILY]
        const uniqueAvatars = new Set(avatars)
        expect(uniqueAvatars.size).toBe(avatars.length)
    })
})

describe('Constants - APP_LOGO', () => {
    it('should point to logo file', () => {
        expect(APP_LOGO).toContain('logo')
    })
})

describe('Constants - MOCK_USERS', () => {
    it('should have 5 mock users', () => {
        expect(MOCK_USERS.length).toBe(5)
    })

    it('should have valid user structures', () => {
        MOCK_USERS.forEach(user => {
            expect(user).toHaveProperty('id')
            expect(user).toHaveProperty('name')
            expect(user).toHaveProperty('email')
            expect(user).toHaveProperty('roles')
            expect(user).toHaveProperty('department')
            expect(user).toHaveProperty('status')
            expect(user).toHaveProperty('avatarUrl')
        })
    })

    it('should have valid email format', () => {
        MOCK_USERS.forEach(user => {
            expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        })
    })

    it('should have valid roles array', () => {
        MOCK_USERS.forEach(user => {
            expect(Array.isArray(user.roles)).toBe(true)
            expect(user.roles.length).toBeGreaterThan(0)
            user.roles.forEach(role => {
                expect(Object.values(UserRole)).toContain(role)
            })
        })
    })

    it('should have valid status values', () => {
        MOCK_USERS.forEach(user => {
            expect(Object.values(UserStatus)).toContain(user.status)
        })
    })

    it('should have unique IDs', () => {
        const ids = MOCK_USERS.map(u => u.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have users with different departments', () => {
        const departments = MOCK_USERS.map(u => u.department)
        const uniqueDepts = new Set(departments)
        expect(uniqueDepts.size).toBeGreaterThan(1)
    })
})

describe('Constants - MOCK_PROJECTS', () => {
    it('should have 3 mock projects', () => {
        expect(MOCK_PROJECTS.length).toBe(3)
    })

    it('should have valid project structures', () => {
        MOCK_PROJECTS.forEach(project => {
            expect(project).toHaveProperty('id')
            expect(project).toHaveProperty('name')
            expect(project).toHaveProperty('deadline')
            expect(project).toHaveProperty('progress')
            expect(project).toHaveProperty('team')
            expect(project).toHaveProperty('color')
        })
    })

    it('should have progress between 0 and 100', () => {
        MOCK_PROJECTS.forEach(project => {
            expect(project.progress).toBeGreaterThanOrEqual(0)
            expect(project.progress).toBeLessThanOrEqual(100)
        })
    })

    it('should have valid color values', () => {
        MOCK_PROJECTS.forEach(project => {
            expect(['primary', 'secondary']).toContain(project.color)
        })
    })

    it('should have team members', () => {
        MOCK_PROJECTS.forEach(project => {
            expect(Array.isArray(project.team)).toBe(true)
            expect(project.team.length).toBeGreaterThan(0)
        })
    })

    it('should have unique IDs', () => {
        const ids = MOCK_PROJECTS.map(p => p.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
    })
})
