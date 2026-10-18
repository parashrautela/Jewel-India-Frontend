/** The server chooses eligibility; these helpers only display/schedule a refresh. */
export function remainingMilliseconds(wallet, monotonicNow) {
  if (wallet?.mode !== 'daily' || !wallet.resets_at || !wallet.server_now) return null;
  const duration = Date.parse(wallet.resets_at) - Date.parse(wallet.server_now);
  const anchor = wallet.received_at_monotonic_ms;
  if (!Number.isFinite(duration) || duration < 0 || duration > 86401000 || !Number.isFinite(anchor) || !Number.isFinite(monotonicNow)) return null;
  return Math.max(0, duration - Math.max(0, monotonicNow - anchor));
}
export function retryDelay(failures) {
  return Math.min(60000, 5000 * 2 ** Math.min(4, Math.max(0, failures - 1)));
}
export function countdown(milliseconds) {
  if (milliseconds == null) return null;
  const seconds = Math.ceil(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}
export function walletError(code) {
  const messages = {
    NOT_AUTHENTICATED: 'Sign in again to check your credits.',
    NOT_VERIFIED: 'Your business needs Jewel India approval before credits are available.',
    CREDIT_PROGRAM_UNAVAILABLE: 'The credit program is unavailable. Please contact support.',
  };
  return messages[code] || "Couldn't refresh your credits. The last balance may be out of date. Please retry.";
}
