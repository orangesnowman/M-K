import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the combined scopes we enabled via set_up_oauth
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.send');

// Force display of prompt to select account or request scopes
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Attempt to load from localStorage on service module evaluation
try {
  cachedAccessToken = localStorage.getItem('g_access_token');
} catch (e) {
  console.warn('Failed to load cached access token from localStorage:', e);
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = localStorage.getItem('g_access_token');
        } catch (e) {
          console.warn('Failed to recover access token from localStorage:', e);
        }
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Fallback: the user is logged in, but we have no cached OAuth token yet.
        // We still trigger success to avoid force logging out, but with fallback empty string
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem('g_access_token');
      } catch (e) {
        console.warn(e);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem('g_access_token', cachedAccessToken);
    } catch (e) {
      console.warn('Failed to write access token to localStorage:', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    localStorage.removeItem('g_access_token');
  } catch (e) {
    console.warn(e);
  }
};
