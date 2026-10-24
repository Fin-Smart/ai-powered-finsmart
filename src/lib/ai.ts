import { getAI, GoogleAIBackend } from 'firebase/ai';

import { app } from './firebase';

/** Firebase AI Logic using the Gemini Developer API (free Spark tier). */
export const ai = getAI(app, { backend: new GoogleAIBackend() });
