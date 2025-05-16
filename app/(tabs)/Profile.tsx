import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { useUserQueryLoginStore } from '@/constants/store'; 
const ProfileSettingsScreen = () => { // Component name reflecting content
    const router = useRouter();

    // Get the currentUser state and logout action directly from the Zustand store
    // isLoading is included just in case the store uses it beyond the initial login attempt
    const { currentUser, logout, isLoading } = useUserQueryLoginStore(); 

    // If the store's isLoading state is true, show a loading indicator.
    // This might be relevant if your store does some async work upon load or hydration,
    // though typically isLoading is tied to the login process itself.
    if (isLoading) { 
        return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="black" />
                <Text style={{ marginTop: 10 }}>Loading user data...</Text>
            </View>
        );
    }

    // If there's no currentUser in the store state, it means the user is not logged in.
    // This might be a fallback if routing isn't strictly protected, or for development.
    // In a protected route, this state shouldn't typically be reached by an unauthenticated user.
    if (!currentUser) {
         return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>No user data available. Please log in.</Text>
                 {/* Provide an option to navigate to the login screen */}
                 <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/login')}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Login</Text>
                 </TouchableOpacity>
             </View>
         );
    }
    const accSet = () => {
        router.replace('../account_settings')
    }
    return (
        <View style={styles.container}>
            <View style={styles.marg}>
                   <Text style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 20, }}>
                {`Welcome, ${currentUser.firstName || currentUser.email || 'User'}!`}
            </Text>
            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('../some_other_settings_page')}>
                 <Text style={styles.settingText} onPress={accSet}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} >
                <Text style={styles.settingText}>View Liked Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} >
                <Text style={styles.settingText}>View Favorite Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingText}>View Hub Posts</Text>
            </TouchableOpacity>
             <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
             </TouchableOpacity>
            </View>
         
        </View>
    );
};
const handleLogout = async () => { 
    const { logout } = useUserQueryLoginStore.getState();
    const router = useRouter(); 

    try {
        logout();
        console.log('User logged out via Zustand store!');
        router.replace('/login'); 

    } catch (error: any) {

        console.error("Error during logout", error);
        Alert.alert("Logout Error", error.message || "An error occurred during logout.");
    }
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white', 
    },
    marg:{
        marginTop: 55,
    },
    settingItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',   
    },
    settingText: {
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: 'red', 
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30, 
        alignSelf: 'center', 
    },
});

// Export the component for use in your router layout
export default ProfileSettingsScreen;