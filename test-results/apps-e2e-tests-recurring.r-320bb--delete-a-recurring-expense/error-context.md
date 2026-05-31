# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/e2e/tests/recurring.regression.spec.ts >> Recurring Expenses — CRUD regression >> create, edit, and delete a recurring expense
- Location: apps/e2e/tests/recurring.regression.spec.ts:15:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/recurring", waiting until "load"

```

# Test source

```ts
  1   | import { expect, Locator, Page } from '@playwright/test';
  2   | import { BasePage } from './BasePage';
  3   | 
  4   | export class RecurringPage extends BasePage {
  5   |   constructor(page: Page) {
  6   |     super(page);
  7   |   }
  8   | 
  9   |   async goto(): Promise<void> {
> 10  |     await this.page.goto('/recurring');
      |                     ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  11  |     await this.waitForLoad();
  12  |   }
  13  | 
  14  |   heading(): Locator {
  15  |     return this.page.getByRole('heading', { level: 1, name: 'Recurring Expenses' });
  16  |   }
  17  | 
  18  |   descriptionText(): Locator {
  19  |     return this.page.getByText(/Track subscriptions/i);
  20  |   }
  21  | 
  22  |   addButton(): Locator {
  23  |     return this.page.getByRole('button', { name: '+ Add Recurring' });
  24  |   }
  25  | 
  26  |   dialog(): Locator {
  27  |     return this.page.getByRole('dialog');
  28  |   }
  29  | 
  30  |   cadenceSelect(): Locator {
  31  |     return this.dialog().locator('select').first();
  32  |   }
  33  | 
  34  |   row(name: string): Locator {
  35  |     return this.page.locator('.recurring-table tbody tr').filter({ hasText: name });
  36  |   }
  37  | 
  38  |   async openAddModal(): Promise<void> {
  39  |     await this.addButton().click();
  40  |     await expect(this.dialog().getByRole('heading', { name: 'Add Recurring Expense' })).toBeVisible();
  41  |   }
  42  | 
  43  |   async fillForm(data: { name: string; amount: string }): Promise<void> {
  44  |     const d = this.dialog();
  45  |     await d.locator('label').filter({ hasText: 'Name' }).locator('input').fill(data.name);
  46  |     await d.locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(data.amount);
  47  |   }
  48  | 
  49  |   async fillAmount(amount: string): Promise<void> {
  50  |     await this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(amount);
  51  |   }
  52  | 
  53  |   async submitAdd(): Promise<void> {
  54  |     await this.dialog().getByRole('button', { name: 'Add Recurring' }).click();
  55  |     await expect(this.dialog()).toBeHidden();
  56  |   }
  57  | 
  58  |   async submitEdit(): Promise<void> {
  59  |     await this.dialog().getByRole('button', { name: 'Update' }).click();
  60  |     await expect(this.dialog()).toBeHidden();
  61  |   }
  62  | 
  63  |   async cancel(): Promise<void> {
  64  |     await this.page.getByRole('button', { name: 'Cancel' }).click();
  65  |   }
  66  | 
  67  |   async editRow(name: string): Promise<void> {
  68  |     await this.row(name).getByRole('button', { name: 'Edit' }).click();
  69  |     await expect(this.dialog().getByRole('heading', { name: 'Edit Recurring Expense' })).toBeVisible();
  70  |   }
  71  | 
  72  |   deleteDialog(): Locator {
  73  |     return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  74  |   }
  75  | 
  76  |   deleteXButton(): Locator {
  77  |     return this.deleteDialog().getByRole('button', { name: 'Close' });
  78  |   }
  79  | 
  80  |   deleteNoButton(): Locator {
  81  |     return this.deleteDialog().getByRole('button', { name: 'No, keep it' });
  82  |   }
  83  | 
  84  |   deleteYesButton(): Locator {
  85  |     return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  86  |   }
  87  | 
  88  |   async openDeleteModal(name: string): Promise<void> {
  89  |     await this.row(name).getByRole('button', { name: 'Delete' }).click();
  90  |     await expect(this.deleteDialog()).toBeVisible();
  91  |   }
  92  | 
  93  |   async deleteRow(name: string): Promise<void> {
  94  |     await this.openDeleteModal(name);
  95  |     await this.deleteYesButton().click();
  96  |     await expect(this.deleteDialog()).toBeHidden();
  97  |   }
  98  | 
  99  |   dueBadge(name: string): Locator {
  100 |     return this.row(name).locator('.pill.over');
  101 |   }
  102 | 
  103 |   confirmPaymentButton(name: string): Locator {
  104 |     return this.row(name).getByRole('button', { name: 'Confirm Payment' });
  105 |   }
  106 | 
  107 |   confirmModal(): Locator {
  108 |     return this.page.getByRole('dialog').filter({ hasText: /already been paid/ });
  109 |   }
  110 | 
```