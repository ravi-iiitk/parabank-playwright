import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  async login(username: string, password: string) {
    await this.page.goto('/parabank/index.htm', { waitUntil: 'domcontentloaded' });
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.getByRole('button', { name: 'Log In' }).click();
  }
}
