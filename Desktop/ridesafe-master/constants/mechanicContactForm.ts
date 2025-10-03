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
    businessLicenseUrl?: string;
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

        if (!email || !phoneNumber || !password || !businessName || !serviceArea || !licenseNumber) {
            const errorMsg = 'All fields are required.';
            set({ saveError: errorMsg, isSaving: false });
            return { success: false, error: errorMsg };
        }

        try {
            let businessLicenseUrl = '';
            let otherCertUrl = '';

            if (businessLicenseFile) {
                const response = await fetch(businessLicenseFile.uri);
                const blob = await response.blob();
                const storageRef = ref(storage, `mechanics/${email}/businessLicense_${businessLicenseFile.name}`);
                await uploadBytes(storageRef, blob);
                businessLicenseUrl = await getDownloadURL(storageRef);
            } else {
                const errorMsg = 'Business license document is required.';
                set({ saveError: errorMsg, isSaving: false });
                return { success: false, error: errorMsg };
            }

            if (otherCertFile) {
                const response = await fetch(otherCertFile.uri);
                const blob = await response.blob();
                const storageRef = ref(storage, `mechanics/${email}/otherCert_${otherCertFile.name}`);
                await uploadBytes(storageRef, blob);
                otherCertUrl = await getDownloadURL(storageRef);
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
                otherCertUrl: otherCertUrl || undefined,
            };

                console.log("Attempting Firestore write for collection 'mechanics'"); 

            const docRef = await addDoc(collection(db, 'mechanics'), mechanicToSave);
            set({ isSaving: false });
            console.log("Firestore write succeeded with ID:", docRef.id); 
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
