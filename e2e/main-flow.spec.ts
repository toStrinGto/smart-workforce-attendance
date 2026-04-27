import { test, expect, Page } from '@playwright/test';

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  permissions: ['geolocation'],
  geolocation: {
    latitude: 31.2304,
    longitude: 121.4737,
  },
});

const accounts = {
  worker: '13800000001',
  foreman: '13800000002',
  boss: '13800000003',
  admin: '13800000004',
};

async function resetAndOpenLogin(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByText('账号登录')).toBeVisible();
}

async function login(page: Page, phone: string) {
  await resetAndOpenLogin(page);
  await page.getByPlaceholder('请输入手机号').fill(phone);
  await page.getByPlaceholder('请输入密码').fill('123456');
  await page.getByRole('button', { name: '登录' }).click();
}

test.describe('智工考勤登录起主流程', () => {
  test('AUTH: 未登录拦截和登录表单校验', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('账号登录')).toBeVisible();

    await page.getByPlaceholder('请输入手机号').fill('123');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('请输入正确的11位手机号')).toBeVisible();

    await page.getByPlaceholder('请输入手机号').fill(accounts.worker);
    await page.getByPlaceholder('请输入密码').fill('123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('密码至少6位')).toBeVisible();

    await page.getByPlaceholder('请输入密码').fill('wrong-password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('手机号或密码错误')).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/auth-login-validation.png', fullPage: true });
  });

  test('WORKER: 登录、打卡、考勤、统计、工作台入口', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.worker);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('张三').first()).toBeVisible();
    await expect(page.getByText('今日打卡记录')).toBeVisible();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('今日打卡记录')).toBeVisible();

    await page.goto('/?role=boss');
    await expect(page.getByText('今日打卡记录')).toBeVisible();
    await expect(page.getByRole('link', { name: '统计' })).toBeVisible();
    await expect(page.getByRole('link', { name: '考勤' })).toBeVisible();

    const punchButton = page.getByRole('button', { name: /上班打卡|下班打卡|今日已完成/ }).first();
    await expect(punchButton).toBeVisible();
    const punchButtonText = (await punchButton.innerText()).trim();
    const punchButtonEnabled = await punchButton.isEnabled();

    if (punchButtonEnabled && punchButtonText !== '今日已完成') {
      await punchButton.click();
      await expect(page.getByText('打卡成功！辛苦了')).toBeVisible({ timeout: 4000 });
    }

    await expect(page.getByText('暂无打卡记录')).toBeHidden();
    await expect(page.getByText(/正常|迟到|早退|缺上班卡|缺下班卡|缺勤/).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/worker-punch.png', fullPage: true });

    await page.getByRole('link', { name: '考勤' }).click();
    await expect(page.getByRole('heading', { name: '我的考勤' })).toBeVisible();

    await page.getByRole('link', { name: '统计' }).click();
    await expect(page.getByRole('heading', { name: '考勤统计' })).toBeVisible();

    await page.getByRole('link', { name: '工作台' }).click();
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await page.getByRole('button', { name: /日报/ }).click();
    await expect(page.getByRole('heading', { name: '施工日报' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await expect(page.getByRole('button', { name: /排班/ })).toBeDisabled();
    await page.getByRole('button', { name: /报销/ }).click();
    await expect(page.getByRole('heading', { name: '费用报销' })).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/worker-reimbursement.png', fullPage: true });
  });

  test('FOREMAN: 登录、批量记工、异常处理、工作台入口', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.foreman);
    await expect(page.getByRole('heading', { name: '批量记工' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('选择工人')).toBeVisible();

    await page.getByRole('button', { name: '全选' }).click();
    await expect(page.getByRole('button', { name: /确认记工/ })).toBeEnabled();
    await page.getByRole('button', { name: /确认记工/ }).click();
    await expect(page.getByText('记工成功！')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/main-flow/foreman-workbench.png', fullPage: true });

    await page.getByRole('link', { name: '异常处理' }).click();
    await expect(page.getByRole('heading', { name: '异常处理' })).toBeVisible();
    const processButtons = page.getByRole('button', { name: '处理', exact: true });
    if (await processButtons.count()) {
      await processButtons.first().click();
      await expect(page.getByRole('heading', { name: '处理异常' })).toBeVisible();
      await page.getByPlaceholder('请输入备注信息...').fill('自动化测试通过处理');
      await page.getByRole('button', { name: '确认处理' }).click();
      await expect(page.getByRole('heading', { name: '处理异常' })).toBeHidden({ timeout: 5000 });
    } else {
      await expect(page.getByRole('button', { name: '待处理 (0)' })).toBeVisible();
      await expect(page.getByText('暂无待处理异常')).toBeVisible();
    }

    await page.getByRole('link', { name: '工作台' }).click();
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await page.getByRole('button', { name: /日报/ }).click();
    await expect(page.getByRole('heading', { name: '施工日报' })).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/foreman-daily-report.png', fullPage: true });
  });

  test('BOSS: 登录、企业看板、考勤、报销审批、工作台入口', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.boss);
    await expect(page.getByRole('heading', { name: '企业看板' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('项目情况')).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/boss-home.png', fullPage: true });

    await page.getByRole('link', { name: '考勤' }).click();
    await expect(page.getByRole('heading', { name: '项目考勤概览' })).toBeVisible();
    await page.getByText('查看人员考勤明细').click();
    await expect(page.getByRole('heading', { name: '人员考勤明细' })).toBeVisible();
    await page.getByText('张三').first().click();
    await expect(page.getByRole('heading', { name: '员工考勤明细' })).toBeVisible();

    await page.goto('/reimbursement');
    await expect(page.getByRole('heading', { name: '费用报销' })).toBeVisible();
    await page.getByRole('button', { name: /审批报销/ }).click();
    await expect(page.getByText('待审批').first()).toBeVisible({ timeout: 8000 });
    const approveButtons = page.getByRole('button', { name: '通过' });
    if (await approveButtons.count()) {
      await approveButtons.first().click();
    }
    await page.screenshot({ path: 'test-results/main-flow/boss-reimbursement.png', fullPage: true });

    await page.goto('/workbench');
    await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
    await page.getByRole('button', { name: /收入合同/ }).click();
    await expect(page.getByRole('heading', { name: '合同管理' })).toBeVisible();
  });

  test('ADMIN: 登录、后台菜单、项目/员工/考勤/设置主流程', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await login(page, accounts.admin);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('智工考勤后台')).toBeVisible();
    await expect(page.getByText('在建项目')).toBeVisible({ timeout: 8000 });

    await page.getByRole('link', { name: /项目管理/ }).click();
    await expect(page.getByRole('heading', { name: '项目管理' })).toBeVisible();
    await page.getByRole('button', { name: /新建项目/ }).click();
    await expect(page.getByRole('heading', { name: '新建项目' })).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();

    await page.getByRole('link', { name: /员工管理/ }).click();
    await expect(page.getByRole('heading', { name: '员工管理' })).toBeVisible();
    await expect(page.getByLabel('员工列表')).toBeVisible();

    await page.getByRole('link', { name: /考勤管理/ }).click();
    await expect(page.getByRole('button', { name: '员工考勤' })).toBeVisible();
    await expect(page.getByRole('button', { name: '项目考勤' })).toBeVisible();
    await expect(page.getByRole('button', { name: '异常管理' })).toBeVisible();

    await page.getByRole('link', { name: /系统设置/ }).click();
    await expect(page.getByText('考勤规则')).toBeVisible();
    await expect(page.getByRole('button', { name: '保存规则' })).toBeVisible();
    await page.screenshot({ path: 'test-results/main-flow/admin-settings.png', fullPage: true });
  });
});
