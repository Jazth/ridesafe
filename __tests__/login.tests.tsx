import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../app/login';
// Mock the entire Firebase modules used in LoginScreen
jest.mock('../scripts/firebaseConfig', () => ({
  db: {}, // db can be an empty object; getDoc/doc will be mocked separately
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(async () => ({
    data: () => ({
      accountStatus: 'active',
      role: 'user',
    }),
  })),
  doc: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(async () => ({
    data: () => ({ accountStatus: 'active', role: 'user' }),
  })),
}));

jest.mock('../constants/store', () => ({
  useUserQueryLoginStore: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to /user on successful login', async () => {
    const { router } = require('expo-router');
    const mockAttemptLogin = jest.fn().mockResolvedValue({ success: true, id: '123', role: 'user', error: null });

    const { useUserQueryLoginStore } = require('../constants/store');
    (useUserQueryLoginStore as jest.Mock).mockReturnValue({
      emailInput: 'papas@example.com',
      passwordInput: 'papas123',
      attemptLoginWithQuery: mockAttemptLogin,
      clearLoginError: jest.fn(),
      loginError: null,
      isLoading: false,
      setEmailInput: jest.fn(),
      setPasswordInput: jest.fn(),
    });

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockAttemptLogin).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/user');
    });
  });

  it('should not navigate on failed login', async () => {
    const { router } = require('expo-router');
    const mockAttemptLogin = jest.fn().mockResolvedValue({ success: false, error: 'Invalid login' });

    const { useUserQueryLoginStore } = require('../constants/store');
    (useUserQueryLoginStore as jest.Mock).mockReturnValue({
      emailInput: 'test@example.com',
      passwordInput: 'wrong-password',
      attemptLoginWithQuery: mockAttemptLogin,
      clearLoginError: jest.fn(),
      loginError: 'Invalid login',
      isLoading: false,
      setEmailInput: jest.fn(),
      setPasswordInput: jest.fn(),
    });

    const { getByTestId } = render(<LoginScreen />);
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockAttemptLogin).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
