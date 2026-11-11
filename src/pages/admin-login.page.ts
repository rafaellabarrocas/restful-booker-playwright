import type { Locator, Page } from "@playwright/test";

/** Admin login form at /admin. */
export class AdminLoginPage {
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: "Login" });
    // The page always renders an empty alert container; the error is the one with text.
    this.errorMessage = page.getByRole("alert").filter({ hasText: /\S/ });
  }

  async open(): Promise<void> {
    await this.page.goto("/admin");
  }

  async logIn(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
