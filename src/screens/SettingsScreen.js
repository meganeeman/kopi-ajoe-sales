import {
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
    const handleLogout = async () => {
        Alert.alert('Konfirmasi Logout', 'Apakah kamu yakin ingin keluar?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Keluar',
                style: 'destructive',
                onPress: async () => await supabase.auth.signOut(),
            },
        ]);
    };

    const handleOpenWhatsApp = () => {
        const adminNumber = '';
        if (!adminNumber) {
            Alert.alert(
                'Pusat Bantuan',
                'Nomor WhatsApp Admin belum diset. Silakan hubungi supervisor kamu.'
            );
            return;
        }
        Linking.openURL(`https://wa.me/${adminNumber}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>PENGATURAN</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tema Aplikasi</Text>
                    <Text style={styles.cardSubtext}>Hitam-Putih (Default)</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Versi Aplikasi</Text>
                    <Text style={styles.cardSubtext}>v1.0.0 (Sales Edition)</Text>
                </View>

                <TouchableOpacity style={styles.cardBtn} onPress={handleOpenWhatsApp}>
                    <View>
                        <Text style={styles.cardTitle}>Pusat Bantuan Admin</Text>
                        <Text style={styles.cardSubtext}>Hubungi CS / Supervisor via WhatsApp</Text>
                    </View>
                    <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>KELUAR AKUN</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardBtn: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    cardSubtext: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    arrowText: {
        fontSize: 22,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#D32F2F',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
});