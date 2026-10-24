import { getAI, GoogleAIBackend } from '@react-native-firebase/ai';

import { app, appCheck, auth } from './firebase';

/** Firebase AI Logic using the Gemini Developer API (free Spark tier), protected by App Check. */
export const ai = getAI(app, { backend: new GoogleAIBackend(), appCheck, auth });
