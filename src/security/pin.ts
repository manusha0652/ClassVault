import * as SecureStore from "expo-secure-store";

const PIN_KEY = "classvault.app-lock.pin";
const FAILED_ATTEMPTS_KEY = "classvault.app-lock.failed-attempts";
const LOCK_UNTIL_KEY = "classvault.app-lock.lock-until";

export async function saveAppPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly four digits.");
  }
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(LOCK_UNTIL_KEY);
}

export async function getAppPin(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function clearAppPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_KEY),
    SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY),
    SecureStore.deleteItemAsync(LOCK_UNTIL_KEY),
  ]);
}

export async function checkAppPin(pin: string): Promise<boolean> {
  const lockUntil = Number(await SecureStore.getItemAsync(LOCK_UNTIL_KEY) ?? 0);
  if (Date.now() < lockUntil) {
    throw new Error(`Try again in ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`);
  }

  const storedPin = await getAppPin();
  if (!storedPin) {
    throw new Error("No app PIN is configured. Contact the account owner.");
  }
  if (storedPin === pin) {
    await SecureStore.deleteItemAsync(FAILED_ATTEMPTS_KEY);
    await SecureStore.deleteItemAsync(LOCK_UNTIL_KEY);
    return true;
  }

  const failedAttempts = Number(await SecureStore.getItemAsync(FAILED_ATTEMPTS_KEY) ?? 0) + 1;
  if (failedAttempts >= 5) {
    await Promise.all([
      SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, "0"),
      SecureStore.setItemAsync(LOCK_UNTIL_KEY, String(Date.now() + 30_000)),
    ]);
    throw new Error("Too many incorrect PINs. Try again in 30 seconds.");
  }
  await SecureStore.setItemAsync(FAILED_ATTEMPTS_KEY, String(failedAttempts));
  return false;
}
