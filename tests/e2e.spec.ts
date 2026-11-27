import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, userId: string, password = 'admin123') {
  await page.goto('/');
  await page.getByTestId(`login-user-${userId}`).click();
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await expect(page.getByTestId('active-user-badge')).toBeVisible();
}

test.describe('TDK & COUTS TCG - Suíte E2E & Harness QA', () => {
  test('0. Tela de Login exige senha admin123 para Thiago, Gabrielle e Andressa', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-user-usr-thiago-admin')).toContainText('Thiago');
    await expect(page.getByTestId('login-user-usr-gabriele-partner')).toContainText('Gabrielle');
    await expect(page.getByTestId('login-user-usr-andressa-treasurer')).toContainText('Andressa');

    await page.getByTestId('login-user-usr-gabriele-partner').click();
    await page.getByTestId('login-password-input').fill('senha-errada');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-error')).toContainText('incorretos');

    await page.getByTestId('login-password-input').fill('admin123');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('active-user-badge')).toContainText('Gabrielle');

    await page.reload();
    await expect(page.getByTestId('active-user-badge')).toContainText('Gabrielle');

    await page.getByTestId('logout-button').click();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();

    await page.getByTestId('login-user-usr-andressa-treasurer').click();
    await page.getByTestId('login-password-input').fill('admin123');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('active-user-badge')).toContainText('Andressa');
  });

  test('1. Dashboard e Minhas Compras exibem total real R$ 4.123,76 com vírgula', async ({ page }) => {
    await loginAs(page, 'usr-thiago-admin');
    await expect(page.getByTestId('kpi-total-investido')).toContainText('R$ 4.123,76');

    await page.getByTestId('nav-tab-compras').click();
    await expect(page.getByTestId('purchases-grand-total')).toContainText('R$ 4.123,76');
    await expect(page.getByText('Ampharos PT AR NM - 090/086')).toBeVisible();
  });

  test('2. Filtros em Minhas Compras e cadastro manual com PikachuIcon em BRL (30,50)', async ({ page }) => {
    await loginAs(page, 'usr-thiago-admin');
    await page.getByTestId('nav-tab-compras').click();

    await page.getByTestId('search-purchases-input').fill('Pikachu');
    await expect(page.getByTestId('purchases-filtered-total')).not.toContainText('R$ 4.123,76');
    await page.getByTestId('search-purchases-input').fill('');

    await page.getByTestId('filter-vendedor-select').selectOption('Smarthie TCG');
    await expect(page.getByText('Genesect ex (067/086) PT RR NM - 067/086')).toBeVisible();
    await page.getByTestId('filter-vendedor-select').selectOption('ALL');

    await page.getByTestId('open-create-purchase').click();
    await page.getByTestId('input-purchase-vendedor').fill('Loja QA Poké');
    await page.getByTestId('input-purchase-descricao').fill('Pikachu Promo QA (001/030)');
    await page.getByTestId('input-purchase-valor').fill('30,50');
    await page.getByTestId('submit-new-purchase').click();

    await expect(page.getByText('Pikachu Promo QA (001/030)')).toBeVisible();
    await expect(page.getByText('R$ 30,50').first()).toBeVisible();
  });

  test('3. Upload resiliente de planilha: linha 3 inválida reportada sem perder linhas válidas', async ({ page }) => {
    const tmpCsv = path.join(process.cwd(), 'data', 'qa-test-upload.csv');
    fs.writeFileSync(
      tmpCsv,
      [
        'Local de Compra,Descrição da Carta,Valor de Compra,Status de Pagamento',
        'Fornecedor Teste,Charizard QA (004/102),"42,50",Pago',
        'Fornecedor Teste,Carta Corrompida QA,"VALOR_INVALIDO",Pago',
        'Fornecedor Teste,Blastoise QA (009/102),"18,00",Pendente',
      ].join('\n'),
      'utf8'
    );

    await loginAs(page, 'usr-thiago-admin');
    await page.getByTestId('nav-tab-compras').click();
    await page.getByTestId('open-upload-purchases').click();

    await page.getByTestId('spreadsheet-file-input').setInputFiles(tmpCsv);
    await expect(page.getByTestId('spreadsheet-error-report')).toContainText('Linha 3');
    await expect(page.getByText('Válidas: 2')).toBeVisible();
    await expect(page.getByText('Com Erro: 1')).toBeVisible();

    await page.getByTestId('confirm-bulk-insert').click();
    await expect(page.getByText('Charizard QA (004/102)')).toBeVisible();
    await expect(page.getByText('Blastoise QA (009/102)')).toBeVisible();

    fs.unlinkSync(tmpCsv);
  });

  test('4. Contabilidade De-Para: Capturar Match e calcular lucro em BRL', async ({ page }) => {
    await loginAs(page, 'usr-thiago-admin');
    await page.getByTestId('nav-tab-contabilidade').click();

    const captureBtn = page.getByTestId('capture-match-0');
    await expect(captureBtn).toBeVisible();
    await captureBtn.click();

    await expect(page.getByTestId('accounting-total-profit')).not.toContainText('R$ 0,00');
  });

  test('5. Clientes: Resumo WhatsApp e Gerador de 10 Etiquetas TDK & COUTS', async ({ page }) => {
    await loginAs(page, 'usr-thiago-admin');
    await page.getByTestId('nav-tab-clientes').click();

    await page.getByTestId('whatsapp-summary-cus-001').click();
    await expect(page.getByTestId('whatsapp-summary-text')).toContainText('Total do pedido:');
    await expect(page.getByTestId('whatsapp-summary-text')).toContainText('Chave PIX:');
    await page.getByRole('button', { name: 'Fechar' }).click();

    await page.getByTestId('toggle-labels-sheet').click();
    await expect(page.getByTestId('labels-a4-sheet')).toBeVisible();
    await expect(page.getByTestId('label-slot-0')).toContainText('TDK & COUTS TCG');
    await expect(page.getByTestId('label-slot-9')).toBeVisible();
  });

  test('6. Segurança RBAC: 401 sem autenticação e 403 para Andressa (Tesouraria) alterando produto', async ({ request }) => {
    const unauthRes = await request.get('/api/purchases');
    expect(unauthRes.status()).toBe(401);

    const treasurerPatch = await request.patch('/api/purchases', {
      headers: {
        'x-tcg-user-id': 'usr-andressa-treasurer',
        'x-tcg-role': 'TREASURER',
      },
      data: {
        id: 'pur-0001',
        descricao: 'Tentativa Invasiva de Alteração',
      },
    });
    expect(treasurerPatch.status()).toBe(403);
  });
});
