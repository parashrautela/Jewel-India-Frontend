// Read-only release check. Never creates codes, grants credits or activates flags.
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const site = process.env.JEWEL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
const database = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!site || !database || !key) {
  console.error('Set NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never put the service key in the iOS app.');
  process.exit(1);
}
const checks = [];
async function read(url, authenticated = false) {
  const response = await fetch(url, {
    headers: authenticated ? { apikey: key, Authorization: `Bearer ${key}` } : {},
    redirect: 'error', signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}
function check(name, ready, detail) {
  checks.push({ name, ready, detail });
}
try {
  const api = await read(new URL('/api/referral/manage', site));
  check('Hosted invitation API', api.status === 401 && typeof api.data?.error === 'string', `HTTP ${api.status}; expected JSON 401 without a session`);
  const schema = await read(new URL('/rest/v1/', database), true);
  if (schema.status !== 200) throw new Error(`Database schema check returned HTTP ${schema.status}`);
  for (const name of ['referral_settings', 'referral_generate', 'referral_expire_due', 'referral_cancel', 'referral_activate', 'credits_preserve_purchased']) {
    check(name, !!schema.data?.paths?.[`/rpc/${name}`], 'Required trusted database function');
  }
  for (const name of ['credit_program', 'referral_preferences', 'referral_report', 'credit_paid_preservation']) {
    check(name, !!schema.data?.paths?.[`/${name}`], 'Required database table/view');
  }
  if (schema.data?.paths?.['/credit_program']) {
    const program = await read(new URL('/rest/v1/credit_program?select=daily_enabled,referral_enabled,payments_enabled', database), true);
    const row = program.data?.[0];
    check('Program activation', program.status === 200 && row?.daily_enabled === true && row?.referral_enabled === true && row?.payments_enabled === false, 'Daily/referral enabled, new payments disabled');
  }
  for (const item of checks) console.log(`${item.ready ? 'PASS' : 'MISSING'} ${item.name}: ${item.detail}`);
  if (checks.some(item => !item.ready)) process.exitCode = 1;
} catch (error) {
  console.error(`Invitation release check failed: ${error.message}`);
  process.exitCode = 1;
}
