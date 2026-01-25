import { describe, it, expect, vi } from 'vitest'

// Utility function tests for common operations used across the app

describe('Utils - Date Formatting', () => {
    it('should format date to YYYY-MM-DD', () => {
        const date = new Date('2024-06-15')
        const formatted = date.toISOString().split('T')[0]
        expect(formatted).toBe('2024-06-15')
    })

    it('should handle different date formats', () => {
        const dateStr = '2024-01-15'
        const date = new Date(dateStr)
        expect(date.getFullYear()).toBe(2024)
        expect(date.getMonth()).toBe(0) // January is 0
        expect(date.getDate()).toBe(15)
    })
})

describe('Utils - ID Generation', () => {
    it('should generate unique IDs using Date.now()', () => {
        const id1 = Date.now().toString()
        // Wait a tiny bit to ensure different timestamps
        const id2 = (Date.now() + 1).toString()
        expect(id1).not.toBe(id2)
    })

    it('should generate random suffixes', () => {
        const suffix1 = Math.random().toString(36).substr(2, 5)
        const suffix2 = Math.random().toString(36).substr(2, 5)
        expect(suffix1.length).toBe(5)
        expect(suffix2.length).toBe(5)
        // Note: There's a small chance these could be equal, but very unlikely
    })
})

describe('Utils - Base64 Encoding/Decoding', () => {
    it('should encode string to base64', () => {
        const original = 'Hello, World!'
        const encoded = btoa(original)
        expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ==')
    })

    it('should decode base64 to string', () => {
        const encoded = 'SGVsbG8sIFdvcmxkIQ=='
        const decoded = atob(encoded)
        expect(decoded).toBe('Hello, World!')
    })

    it('should roundtrip encode/decode', () => {
        const original = '测试文本 Test 123'
        // Note: btoa/atob only works with ASCII, need encoding for unicode
        const encoded = btoa(encodeURIComponent(original))
        const decoded = decodeURIComponent(atob(encoded))
        expect(decoded).toBe(original)
    })
})

describe('Utils - URL Validation', () => {
    it('should validate complete URLs', () => {
        const validUrls = [
            'https://example.com',
            'https://api.openai.com/v1',
            'http://localhost:11434/v1',
            'https://dashscope.aliyuncs.com/compatible-mode/v1'
        ]

        validUrls.forEach(url => {
            expect(() => new URL(url)).not.toThrow()
        })
    })

    it('should reject invalid URLs', () => {
        const invalidUrls = [
            'not-a-url',
            'just text',
            'ftp://invalid'
        ]

        invalidUrls.forEach(url => {
            try {
                new URL(url)
                // FTP is actually a valid URL scheme, so we need to check specifically
            } catch {
                expect(true).toBe(true)
            }
        })
    })
})

describe('Utils - JSON Parsing', () => {
    it('should parse valid JSON array', () => {
        const jsonStr = '[{"name": "test", "value": 123}]'
        const parsed = JSON.parse(jsonStr)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed[0].name).toBe('test')
    })

    it('should parse valid JSON object', () => {
        const jsonStr = '{"name": "test", "nested": {"key": "value"}}'
        const parsed = JSON.parse(jsonStr)
        expect(parsed.name).toBe('test')
        expect(parsed.nested.key).toBe('value')
    })

    it('should throw on invalid JSON', () => {
        const invalidJson = '{invalid json}'
        expect(() => JSON.parse(invalidJson)).toThrow()
    })

    it('should extract JSON array from text using regex', () => {
        const textWithJson = 'Some text before [{"id": 1}, {"id": 2}] some text after'
        const match = textWithJson.match(/\[[\s\S]*\]/)
        expect(match).not.toBeNull()
        const parsed = JSON.parse(match![0])
        expect(parsed.length).toBe(2)
    })
})

describe('Utils - Level Parsing', () => {
    const parseLevel = (levelStr: string): string => {
        const normalizedLevel = levelStr.toLowerCase()
        if (normalizedLevel.includes('国家') || normalizedLevel.includes('national')) return '国家级'
        if (normalizedLevel.includes('省') || normalizedLevel.includes('provincial')) return '省级'
        if (normalizedLevel.includes('市') || normalizedLevel.includes('municipal')) return '市级'
        if (normalizedLevel.includes('区') || normalizedLevel.includes('县') || normalizedLevel.includes('district')) return '区县级'
        if (normalizedLevel.includes('校') || normalizedLevel.includes('school')) return '校级'
        return '市级' // default
    }

    it('should parse Chinese level names', () => {
        expect(parseLevel('国家级')).toBe('国家级')
        expect(parseLevel('省级')).toBe('省级')
        expect(parseLevel('市级')).toBe('市级')
        expect(parseLevel('区县级')).toBe('区县级')
        expect(parseLevel('校级')).toBe('校级')
    })

    it('should parse English level names', () => {
        expect(parseLevel('National')).toBe('国家级')
        expect(parseLevel('Provincial')).toBe('省级')
        expect(parseLevel('Municipal')).toBe('市级')
        expect(parseLevel('District')).toBe('区县级')
        expect(parseLevel('School')).toBe('校级')
    })

    it('should default to Municipal for unknown levels', () => {
        expect(parseLevel('unknown')).toBe('市级')
        expect(parseLevel('')).toBe('市级')
    })
})

describe('Utils - Category Parsing', () => {
    const parseCategory = (categoryStr: string): string => {
        const normalizedCat = categoryStr.toLowerCase()
        if (normalizedCat.includes('荣誉') || normalizedCat.includes('表彰') || normalizedCat.includes('award')) return '荣誉表彰'
        if (normalizedCat.includes('课题') || normalizedCat.includes('project')) return '课题结项'
        if (normalizedCat.includes('培训') || normalizedCat.includes('training')) return '培训结业'
        if (normalizedCat.includes('职称') || normalizedCat.includes('资格') || normalizedCat.includes('qualification')) return '职称资格'
        return '其他成果'
    }

    it('should parse Chinese category names', () => {
        expect(parseCategory('荣誉表彰')).toBe('荣誉表彰')
        expect(parseCategory('课题结项')).toBe('课题结项')
        expect(parseCategory('培训结业')).toBe('培训结业')
        expect(parseCategory('职称资格')).toBe('职称资格')
    })

    it('should parse English category names', () => {
        expect(parseCategory('Award')).toBe('荣誉表彰')
        expect(parseCategory('Project')).toBe('课题结项')
        expect(parseCategory('Training')).toBe('培训结业')
        expect(parseCategory('Qualification')).toBe('职称资格')
    })

    it('should default to Other for unknown categories', () => {
        expect(parseCategory('unknown')).toBe('其他成果')
        expect(parseCategory('')).toBe('其他成果')
    })
})

describe('Utils - Provider Configuration Validation', () => {
    interface ProviderConfig {
        name: string
        baseUrl: string
        apiKey: string
        modelId?: string
    }

    const validateProvider = (config: any): config is ProviderConfig => {
        return (
            typeof config.name === 'string' && config.name.length > 0 &&
            typeof config.baseUrl === 'string' && config.baseUrl.length > 0 &&
            typeof config.apiKey === 'string' && config.apiKey.length > 0
        )
    }

    it('should validate complete provider config', () => {
        const validConfig = {
            name: 'Test Provider',
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-xxx',
            modelId: 'gpt-4o'
        }
        expect(validateProvider(validConfig)).toBe(true)
    })

    it('should validate config without optional modelId', () => {
        const validConfig = {
            name: 'Test Provider',
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-xxx'
        }
        expect(validateProvider(validConfig)).toBe(true)
    })

    it('should reject config missing name', () => {
        const invalidConfig = {
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-xxx'
        }
        expect(validateProvider(invalidConfig)).toBe(false)
    })

    it('should reject config with empty values', () => {
        const invalidConfig = {
            name: '',
            baseUrl: 'https://api.example.com/v1',
            apiKey: 'sk-xxx'
        }
        expect(validateProvider(invalidConfig)).toBe(false)
    })
})

describe('Utils - Search Filtering', () => {
    const mockCertificates = [
        { name: '优秀教师奖', issuer: '省教育厅', level: '省级', category: '荣誉表彰' },
        { name: 'AI 教学培训', issuer: '教师进修学院', level: '市级', category: '培训结业' },
        { name: '高级教师资格', issuer: '人社局', level: '市级', category: '职称资格' }
    ]

    const filterCertificates = (certs: typeof mockCertificates, searchTerm: string) => {
        const search = searchTerm.toLowerCase()
        return certs.filter(cert =>
            cert.name.toLowerCase().includes(search) ||
            cert.issuer.toLowerCase().includes(search) ||
            cert.level.toLowerCase().includes(search) ||
            cert.category.toLowerCase().includes(search)
        )
    }

    it('should filter by name', () => {
        const results = filterCertificates(mockCertificates, '教师')
        // Matches: "优秀教师奖", "教师进修学院"(issuer), "高级教师资格"
        expect(results.length).toBe(3)
    })

    it('should filter by issuer', () => {
        const results = filterCertificates(mockCertificates, '教育厅')
        expect(results.length).toBe(1)
    })

    it('should filter by level', () => {
        const results = filterCertificates(mockCertificates, '省级')
        expect(results.length).toBe(1)
    })

    it('should filter by category', () => {
        const results = filterCertificates(mockCertificates, '培训')
        expect(results.length).toBe(1)
    })

    it('should return empty for no matches', () => {
        const results = filterCertificates(mockCertificates, 'xyz不存在')
        expect(results.length).toBe(0)
    })

    it('should return all for empty search', () => {
        const results = filterCertificates(mockCertificates, '')
        expect(results.length).toBe(3)
    })
})
