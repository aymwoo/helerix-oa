import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sql.js
const mockDatabase = {
    run: vi.fn(),
    exec: vi.fn(() => []),
    prepare: vi.fn(() => ({
        run: vi.fn(),
        getAsObject: vi.fn(() => ({})),
        free: vi.fn(),
    })),
    export: vi.fn(() => new Uint8Array()),
}

const mockSQL = {
    Database: vi.fn(function () { return mockDatabase }),
}

Object.defineProperty(window, 'initSqlJs', {
    value: vi.fn(() => Promise.resolve(mockSQL)),
})

// Mock btoa/atob
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary')

// Mock FileReader
class MockFileReader {
    result: string | ArrayBuffer | null = null
    onloadend: (() => void) | null = null
    onerror: (() => void) | null = null

    readAsDataURL(blob: Blob) {
        setTimeout(() => {
            this.result = 'data:image/png;base64,mockBase64Data'
            if (this.onloadend) this.onloadend()
        }, 0)
    }

    readAsText(blob: Blob) {
        setTimeout(() => {
            this.result = '{"test": true}'
            if (this.onloadend) this.onloadend()
        }, 0)
    }

    readAsArrayBuffer(blob: Blob) {
        setTimeout(() => {
            this.result = new ArrayBuffer(8)
            if (this.onloadend) this.onloadend()
        }, 0)
    }
}

global.FileReader = MockFileReader as any

// Mock URL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
    value: {
        readText: vi.fn(() => Promise.resolve('')),
        writeText: vi.fn(() => Promise.resolve()),
    },
    writable: true,
})

// Mock confirm and alert
global.confirm = vi.fn(() => true)
global.alert = vi.fn()
global.prompt = vi.fn(() => 'Test Input')
