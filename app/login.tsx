import { useUserQueryLoginStore } from '@/constants/store';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
const appLogo = require('../assets/images/logo.jpg');

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const {
        emailInput,
        passwordInput,
        isLoading,
        loginError,
        setEmailInput,
        setPasswordInput,
        attemptLoginWithQuery,
        clearLoginError
    } = useUserQueryLoginStore();

    const handleSignIn = async () => {
        if (loginError) {
            clearLoginError();
        }
        console.log('Attempting login with:', { email: emailInput, password: passwordInput });
        const result = await attemptLoginWithQuery();

        if (result.success) {
            router.replace('/(tabs)');
        } else if (result.error) {
        }
    };

    const handleRegister = () => {
        router.replace('/register');
    };

    return (
         <SafeAreaView
            style={styles.keyboardAvoidingContainer}
        >
            <View style={styles.container}>
                <StatusBar style="light" />

                <Image
                    source={appLogo}
                    style={styles.logo}
                    resizeMode="contain"
                />
                   {loginError && (
                        <Text style={styles.errorText}>{loginError}</Text>
                    )}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="white"
                        value={emailInput}
                        onChangeText={setEmailInput}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="white"
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                        secureTextEntry
                        editable={!isLoading}
                    />

                 
                </View>

      

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.signInButton]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={[styles.buttonText, styles.signInButtonText]}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                                  {/* Separator line with text */}
                <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>OR</Text>
                    <View style={styles.separatorLine} />
                </View>
                    <TouchableOpacity
                        style={[styles.button, styles.registerButton]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        <Text style={[styles.buttonText, styles.registerButtonText]}>SIGN UP</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: width * 0.075,
    },
    logo: {
        width: 250 ,
        height: 280,
        marginBottom: 50,
    },
    inputContainer: {    
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    input: {
        backgroundColor: 'black',
        color: 'white',
        paddingVertical: 8, 
        paddingHorizontal: 15,
        borderRadius: 15,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#FFF',
        marginBottom: 10,
        
        width: '90%', 
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginVertical: 10,
        marginBottom: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        width: 100,
        backgroundColor: '#FFF',
    },
    separatorText: {
        width: 20,
        textAlign: 'center',
        color: '#FFF',
        fontSize: 12,
        marginHorizontal: 10,
    },
    buttonContainer: {
        width: '90%',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    button: {
        paddingVertical: 8, 
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        width: '100%', 
    },
    signInButton: {
        backgroundColor: '#FF5722',
        borderWidth: 0,
        borderColor: '#FFF',
        
    },
    registerButton: {
        borderColor: '#FF5722',
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 18, 
        fontWeight: 'bold',
    },
    signInButtonText: {
        color: '#FFF',
        textTransform: 'uppercase',
        padding: 2,
    },
    registerButtonText: {
        color: '#FFF',
    },
});
