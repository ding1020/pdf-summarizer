export {};

declare global {
  interface Window {
    Clerk?: {
      signOut: () => void;
    };
  }
}
