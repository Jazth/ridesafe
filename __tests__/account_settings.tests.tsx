// Mock Firebase Firestore and React Native
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ type: 'mocked-doc-ref' })),
  updateDoc: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));
const originalConsoleError = console.error;

describe('Firestore Vehicle Update', () => {
  let doc, updateDoc, Alert;

  beforeAll(() => {
    ({ doc, updateDoc } = require('firebase/firestore'));
    ({ Alert } = require('react-native'));
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const removeVehicleFromFirestore = async (db, userId, updatedVehicles) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { vehicles: updatedVehicles });
      Alert.alert('Success', 'Vehicle removed successfully.');
    } catch (error) {
      console.error('Error removing vehicle from Firestore:', error);
      Alert.alert('Error', 'Failed to remove vehicle.');
    }
  };

  it('should successfully update the document and show a success alert', async () => {
    const mockDb = {}; 
    const mockUserId = 'user123';
    const mockUpdatedVehicles = [{ make: 'Ford', model: 'Focus' }];
    await removeVehicleFromFirestore(mockDb, mockUserId, mockUpdatedVehicles);
    expect(doc).toHaveBeenCalledWith(mockDb, 'users', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(
      { type: 'mocked-doc-ref' },
      { vehicles: mockUpdatedVehicles }
    );
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Vehicle removed successfully.');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should show an error alert on Firestore update failure', async () => {
    const mockDb = {};
    const mockUserId = 'user123';
    const mockUpdatedVehicles = [];
    const mockError = new Error('Firestore write failed');
    updateDoc.mockRejectedValue(mockError);

    await removeVehicleFromFirestore(mockDb, mockUserId, mockUpdatedVehicles);

    expect(doc).toHaveBeenCalledWith(mockDb, 'users', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(
      { type: 'mocked-doc-ref' },
      { vehicles: mockUpdatedVehicles }
    );
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to remove vehicle.');
    expect(console.error).toHaveBeenCalledWith('Error removing vehicle from Firestore:', mockError);
  });
});
