import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

import { auth } from '../lib/firebase';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return user;
}

/** Like `useAuthUser`, but also reports whether Firebase is still restoring a saved session. */
export function useAuthState() {
  const [state, setState] = useState<{ user: User | null; initializing: boolean }>({
    user: auth.currentUser,
    initializing: true,
  });

  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, initializing: false })), []);

  return state;
}
