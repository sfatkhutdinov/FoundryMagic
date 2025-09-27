export default {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    moduleFileExtensions: ["js", "ts", "json"],
    transform: {
        "^.+\\.(js|ts)$": "babel-jest"
    },
    testMatch: [
        "<rootDir>/tests/**/*.test.js",
        "<rootDir>/tests/**/*.test.ts"
    ],
    collectCoverageFrom: [
        "src/**/*.{js,ts}",
        "!src/**/*.d.ts",
        "!src/tests/**"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1"
    },
    testTimeout: 10000
};