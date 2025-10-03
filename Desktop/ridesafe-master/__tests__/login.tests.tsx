import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../app/login';
import { useUserQueryLoginStore } from '../constants/store';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

// Mock the entire Zustand store that i am using
jest.mock('../constants/store', () => ({
  useUserQueryLoginStore: jest.fn(),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to the tabs screen on successful login', async () => {
    const { router } = require('expo-router');
    const mockAttemptLogin = jest.fn().mockResolvedValue({ success: true, error: null });
    const result = await mockAttemptLogin();
    (useUserQueryLoginStore as unknown as jest.Mock).mockReturnValue({
      emailInput: 'papas@example.com',
      passwordInput: 'papas123',
      attemptLoginWithQuery: mockAttemptLogin,
      clearLoginError: jest.fn(),
      loginError: null,
    });
    
    console.log("Attempting to Login with valid credentials: ", result);
    const { getByTestId } = render(<LoginScreen />);
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockAttemptLogin).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('should not navigate on failed login', async () => {
    const { router } = require('expo-router');
    const mockAttemptLogin = jest.fn().mockResolvedValue({ success: false, error: 'Invalid login' });
    const result = mockAttemptLogin();
    (useUserQueryLoginStore as unknown as jest.Mock).mockReturnValue({
      emailInput: 'test@example.com',
      passwordInput: 'wrong-password',
      attemptLoginWithQuery: mockAttemptLogin,
      clearLoginError: jest.fn(),
      loginError: 'Invalid login',
    });
    
    console.log("Attempting to Login with invalid credentials: ", result);
    const { getByTestId } = render(<LoginScreen />);
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockAttemptLogin).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});