declare global {
  interface Window {
    fbq?: (
      command: 'track',
      event: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export {};
