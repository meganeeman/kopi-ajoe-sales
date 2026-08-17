import * as Application from 'expo-application';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS } from '../constants/theme';
import { useOtaUpdate } from '../utils/useOtaUpdate';

export default function LoginScreen({ navigation }) {
    useOtaUpdate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Silakan isi email dan password!');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) throw error;

            let deviceId = 'unknown_device';
            if (Platform.OS === 'android') {
                deviceId = Application.getAndroidId() || 'android_device';
            } else if (Platform.OS === 'ios') {
                const iosId = await Application.getIosIdForVendorAsync();
                deviceId = iosId || 'ios_device';
            }

            if (data?.user) {
                await supabase
                    .from('users')
                    .update({ current_device_id: deviceId })
                    .eq('id', data.user.id);
            }
        } catch (error) {
            Alert.alert('Login Gagal', error.message || 'Email atau password salah.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.innerContainer}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>KOPI AJOE</Text>
                    <Text style={styles.subtitle}>Aplikasi Kasir & Sales Gerobak</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Sales</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="sales@kopiajoe.com"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.secondary} />
                        ) : (
                            <Text style={styles.loginButtonText}>MASUK</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                        Pendaftaran akun sales hanya dapat dilakukan oleh Manajemen Pusat Kopi Ajoe.
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    innerContainer: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 6,
        fontWeight: '500',
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
    },
    loginButtonText: {
        color: COLORS.secondary,
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    footerContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
});