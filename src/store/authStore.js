import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'dr_jwt_token';
const USER_KEY = 'dr_user_data';

/**
 * Global Authentication State Store (Zustand)
 * Manages user session, JWT token, and AsyncStorage persistence.
 * Token is saved to AsyncStorage on login and restored on app launch.
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,

  /**
   * Set user session after login or signup.
   * Persists token and user data to AsyncStorage so they survive app restarts.
   */
  setUser: async (user, token) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('[AuthStore] Failed to persist session:', e.message);
    }
    set({
      user,
      token,
      isAuthenticated: !!token,
      isInitializing: false,
    });
  },

  /**
   * Restore session from AsyncStorage on app launch.
   * Called once during the splash/initialization phase.
   * If a saved token exists, it is restored so all API calls work immediately.
   */
  checkSession: async () => {
    try {
      const [savedToken, savedUserJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (savedToken && savedUserJson) {
        const savedUser = JSON.parse(savedUserJson);
        set({
          token: savedToken,
          user: savedUser,
          isAuthenticated: true,
          isInitializing: false,
        });
        return savedToken;
      }
    } catch (e) {
      console.warn('[AuthStore] Failed to restore session:', e.message);
    }

    set({ isInitializing: false });
    return null;
  },

  /**
   * Logout — clears in-memory state and removes persisted session from AsyncStorage.
   */
  logout: async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (e) {
      console.warn('[AuthStore] Failed to clear session:', e.message);
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  },
}));

export default useAuthStore;
