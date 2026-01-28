/**
 * Test Setup File
 * 
 * This file runs before each test file and sets up the testing environment.
 * It configures:
 * - jest-dom matchers for enhanced DOM assertions
 * - Mock implementations for browser APIs not available in jsdom
 */

import '@testing-library/jest-dom';

/**
 * Mock WebSocket implementation for testing
 * Since jsdom doesn't provide a full WebSocket implementation,
 * we create a mock that simulates WebSocket behavior
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(_data: string): void {
    // Mock send - can be extended for specific tests
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Assign mock to global
global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

/**
 * Mock ResizeObserver
 * Required for OpenLayers map components
 */
global.ResizeObserver = class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

/**
 * Mock matchMedia
 * Required for responsive design testing
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
