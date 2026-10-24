import AsyncStorage from '@react-native-async-storage/async-storage';

/** Kept across sign-outs: a preference about this phone, not about the account. */
const DEVICE_KEYS = new Set(['settings:theme']);

const resetters = new Set<() => void>();

/** Registers a function that wipes a module's in-memory copy of the signed-in person's data. */
export function onSignOut(reset: () => void) {
  resetters.add(reset);
}

/** Wipes every registered in-memory cache straight away. */
export function resetSessionMemory() {
  resetters.forEach((reset) => {
    try {
      reset();
    } catch {
      // One module failing to reset must not stop the others.
    }
  });
}

/** Deletes everything FinSmart stored on the phone for the account: chats, cached emails, habits, settings. */
export async function clearStoredData() {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => !DEVICE_KEYS.has(key)));
}
