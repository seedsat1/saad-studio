/**
 * auth.js — EditPilot AI (Saad Studio)
 *
 * Handles login flow, session restore, and logout.
 * Coordinates between apiClient and storage.
 */

import { login as apiLogin, logoutLocal as apiLogoutLocal } from './apiClient.js';
import { saveSession, getSession, clearSession }            from './storage.js';

/**
 * Attempt login with email + password.
 * On success, saves session to storage and returns the session object.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token:string, email:string, name:string, plan:string, credits:number, subscriptionActive:boolean}>}
 */
export async function attemptLogin(email, password) {
  if (!email || !password) throw new Error('Email and password are required.');

  const data = await apiLogin(email, password);

  if (!data?.success || !data?.token) {
    throw new Error(data?.error || 'Login failed. Check your credentials.');
  }

  const session = {
    token:   data.token,
    email:   data.user?.email   || email,
    name:    data.user?.name    || '',
    plan:    data.subscription?.plan   || 'Free',
    credits: data.credits?.balance     ?? 0,
  };

  saveSession(session);

  return {
    ...session,
    subscriptionActive: data.subscription?.active === true,
  };
}

/**
 * Restore session from local storage.
 * Returns null if no stored token found.
 * Does NOT validate the token with the server — use refreshFromServer() for that.
 *
 * @returns {{token:string, email:string, name:string, plan:string, credits:number}|null}
 */
export function restoreSession() {
  return getSession();
}

/**
 * Fully log out:
 *  - clears local storage
 *  - marks client session as invalid
 */
export function logout() {
  apiLogoutLocal();
  clearSession();
}
