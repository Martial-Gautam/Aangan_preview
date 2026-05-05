/**
 * Global type declarations for non-standard Web APIs
 */

/**
 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt handler
 * before a user is prompted to "install" a web site to a home screen on mobile.
 * This is a non-standard API supported by Chromium-based browsers.
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Shows the install prompt to the user.
   * Returns a Promise that resolves with the user's choice.
   */
  prompt(): Promise<void>;

  /**
   * Returns a Promise that resolves with the user's choice
   * when they interact with the install prompt.
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}
