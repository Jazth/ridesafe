import { db, storage } from '@/scripts/firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { create } from 'zustand';

interface MechanicRegistrationFormData { 
  email: string;
  phoneNumber: string;
  password: string;
  businessName: string;
  serviceArea: string;
  licenseNumber: string;
}

interface MechanicToSave extends MechanicRegistrationFormData { 
  createdAt: Timestamp;
  role: 'mechanic';
  status: 'pending';
  businessLicenseUrl: string;
  driversLicenseUrl: string;
  nbiClearanceUrl: string;
  otherCertUrl?: string;
}

interface MechanicRegistrationFormState extends MechanicRegistrationFormData {
  isSaving: boolean;
  saveError: string | null;
}

interface MechanicRegistrationFormActions {
  setEmail: (email: string) => void;
  setPhoneNumber: (number: string) => void;
  setPassword: (password: string) => void;
  setBusinessName: (name: string) => void;
  setServiceArea: (area: string) => void;
  setLicenseNumber: (num: string) => void;

  resetForm: () => void;

  saveMechanicRegistrationData: (
    data: MechanicRegistrationFormData,
    businessLicenseFile: { uri: string, name: string } | null,
    driversLicenseFile: { uri: string, name: string } | null,
    nbiClearanceFile: { uri: string, name: string } | null,
    otherCertFile: { uri: string, name: string } | null
  ) => Promise<{ success: boolean; error?: string; docId?: string }>;

  setSaveError: (error: string | null) => void;
}

type MechanicRegistrationFormStore = MechanicRegistrationFormState & MechanicRegistrationFormActions;

export const useMechanicRegistrationStore = create<MechanicRegistrationFormStore>((set, get) => ({
  email: '',
  phoneNumber: '',
  password: '',
  businessName: '',
  serviceArea: '',
  licenseNumber: '',

  isSaving: false,
  saveError: null,

  setEmail: (emailValue) => set({ email: emailValue, saveError: null }),
  setPhoneNumber: (numberValue) => set({ phoneNumber: numberValue, saveError: null }),
  setPassword: (passwordValue) => set({ password: passwordValue, saveError: null }),
  setBusinessName: (name) => set({ businessName: name, saveError: null }),
  setServiceArea: (area) => set({ serviceArea: area, saveError: null }),
  setLicenseNumber: (num) => set({ licenseNumber: num, saveError: null }),

  resetForm: () => set({
    email: '',
    phoneNumber: '',
    password: '',
    businessName: '',
    serviceArea: '',
    licenseNumber: '',
    isSaving: false,
    saveError: null,
  }),

  saveMechanicRegistrationData: async (
    data,
    businessLicenseFile,
    driversLicenseFile,
    nbiClearanceFile,
    otherCertFile
  ) => {
    set({ isSaving: true, saveError: null });

    const {
      email,
      phoneNumber,
      password,
      businessName,
      serviceArea,
      licenseNumber,
    } = data;

    // Required fields and files validation
    if (
      !email || !phoneNumber || !password || !businessName || !serviceArea || !licenseNumber ||
      !businessLicenseFile || !driversLicenseFile || !nbiClearanceFile
    ) {
      const errorMsg = 'Please fill all required fields and upload all required documents (Business License, Driver’s License, NBI Clearance).';
      set({ saveError: errorMsg, isSaving: false });
      return { success: false, error: errorMsg };
    }

    try {
      // Helper to upload file and get URL
      const uploadFile = async (file: { uri: string; name: string }, folder: string) => {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `mechanics/${email}/${folder}_${file.name}`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      };

      const businessLicenseUrl = await uploadFile(businessLicenseFile, 'businessLicense');
      const driversLicenseUrl = await uploadFile(driversLicenseFile, 'driversLicense');
      const nbiClearanceUrl = await uploadFile(nbiClearanceFile, 'nbiClearance');

      let otherCertUrl = '';
      if (otherCertFile) {
        otherCertUrl = await uploadFile(otherCertFile, 'otherCert');
      }

      const mechanicToSave: MechanicToSave = {
        email: email.trim(),
        phoneNumber,
        password,
        businessName,
        serviceArea,
        licenseNumber,
        createdAt: Timestamp.now(),
        role: 'mechanic',
        status: 'pending',
        businessLicenseUrl,
        driversLicenseUrl,
        nbiClearanceUrl,
        otherCertUrl: otherCertUrl || undefined,
      };

      const docRef = await addDoc(collection(db, 'mechanics'), mechanicToSave);
      set({ isSaving: false });
      return { success: true, docId: docRef.id };
    } catch (error: any) {
      console.error('Error saving mechanic data:', error);
      const message = error.message || 'Failed to save mechanic data. Please try again.';
      set({ saveError: message, isSaving: false });
      return { success: false, error: message };
    }
  },

  setSaveError: (errorValue) => set({ saveError: errorValue }),
}));
