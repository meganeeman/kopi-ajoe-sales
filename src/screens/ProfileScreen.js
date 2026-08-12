import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS } from '../constants/theme';

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [cartUnit, setCartUnit] = useState(null);
    const [productPerformance, setProductPerformance] = useState([]);
    const [stats, setStats] = useState({
        totalCommission: 0,
        totalCups: 0,
        totalTransactions: 0,
    });

    useEffect(() => {
        fetchProfileAndStats();
    }, []);

    const fetchProfileAndStats = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('name, role')
                .eq('email', user.email)
                .maybeSingle();

            setUserProfile({
                ...user,
                displayName: userData?.name || 'Sales Partner',
            });

            const { data: unitData } = await supabase
                .from('cart_units')
                .select('*')
                .eq('active_sales_id', user.id)
                .maybeSingle();

            if (unitData) {
                setCartUnit(unitData);
            } else {
                const { data: fallbackUnit } = await supabase
                    .from('cart_units')
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                setCartUnit(fallbackUnit || null);
            }

            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('commission_earned, total_cups')
                .eq('sales_id', user.id)
                .eq('payment_status', 'success');

            if (error) throw error;

            if (transactions && transactions.length > 0) {
                const totalComm = transactions.reduce(
                    (sum, item) => sum + (item.commission_earned || 0),
                    0
                );
                const totalCupsSold = transactions.reduce(
                    (sum, item) => sum + (item.total_cups || 0),
                    0
                );

                setStats({
                    totalCommission: totalComm,
                    totalCups: totalCupsSold,
                    totalTransactions: transactions.length,
                });
            } else {
                setStats({
                    totalCommission: 0,
                    totalCups: 0,
                    totalTransactions: 0,
                });
            }

            fetchProductPerformance(user.id);

        } catch (error) {
            Alert.alert('Error', 'Gagal memuat data profil dan komisi.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchProductPerformance = async (salesId) => {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('items')
                .eq('sales_id', salesId)
                .eq('payment_status', 'success');

            if (error || !transactions || transactions.length === 0) {
                setProductPerformance([]);
                return;
            }

            const itemSummary = {};

            transactions.forEach((trans) => {
                const itemsList = trans.items || [];
                if (Array.isArray(itemsList)) {
                    itemsList.forEach((item) => {
                        const name = item.name || 'Produk Kopi Ajoe';
                        const category = item.category || 'COFFEE';
                        const qty = item.quantity || 1;

                        if (!itemSummary[name]) {
                            itemSummary[name] = {
                                id: item.id || name,
                                name: name,
                                category: category,
                                cupsSold: 0,
                            };
                        }
                        itemSummary[name].cupsSold += qty;
                    });
                }
            });

            const performanceList = Object.values(itemSummary).sort(
                (a, b) => b.cupsSold - a.cupsSold
            );

            setProductPerformance(performanceList);
        } catch (err) {
            console.log('Error performance:', err);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfileAndStats();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>PROFIL SALES</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.userCard}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                                {userProfile?.displayName
                                    ? userProfile.displayName.charAt(0).toUpperCase()
                                    : 'S'}
                            </Text>
                        </View>
                        <Text style={styles.userName}>{userProfile?.displayName || 'Sales Partner'}</Text>
                        <Text style={styles.userEmail}>{userProfile?.email || 'sales@kopiajoe.com'}</Text>

                        <View style={styles.badgeRow}>
                            <View style={styles.badgeItem}>
                                <Text style={styles.badgeText}>Sales Partner</Text>
                            </View>
                            <View style={styles.badgeItemOutline}>
                                <Text style={styles.badgeTextOutline}>
                                    {cartUnit ? `${cartUnit.unit_name} (${cartUnit.vehicle_type})` : 'Belum Ada Gerobak'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.commissionCard}>
                        <Text style={styles.commissionLabel}>TOTAL KOMISI TERKUMPUL</Text>
                        <Text style={styles.commissionValue}>
                            Rp {stats.totalCommission.toLocaleString('id-ID')}
                        </Text>
                        <Text style={styles.commissionSubtext}>
                            *Dihitung riil berdasarkan transaksi sukses
                        </Text>
                    </View>

                    <Text style={styles.sectionTitle}>Ringkasan Performa</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{stats.totalCups}</Text>
                            <Text style={styles.statLabel}>Cup Terjual</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{stats.totalTransactions}</Text>
                            <Text style={styles.statLabel}>Transaksi Sukses</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Top Produk Terjual</Text>

                    {productPerformance.length > 0 ? (
                        <View style={styles.productPerfContainer}>
                            {productPerformance.map((item) => (
                                <View key={item.id} style={styles.productPerfRow}>
                                    <View style={styles.productPerfInfo}>
                                        <Text style={styles.productPerfCategory}>{item.category}</Text>
                                        <Text style={styles.productPerfName}>{item.name}</Text>
                                    </View>
                                    <View style={styles.productPerfBadge}>
                                        <Text style={styles.productPerfBadgeText}>
                                            {item.cupsSold} Cup
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyPerfBox}>
                            <Text style={styles.emptyPerfText}>Belum ada transaksi produk hari ini</Text>
                        </View>
                    )}
                </ScrollView>
            )}
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
        paddingVertical: 14,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    userCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 14,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    badgeItem: {
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    badgeItemOutline: {
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },
    badgeTextOutline: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    commissionCard: {
        backgroundColor: '#000000',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    commissionLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#8E8E93',
        letterSpacing: 1,
    },
    commissionValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginVertical: 6,
    },
    commissionSubtext: {
        fontSize: 10,
        color: '#8E8E93',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 10,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginHorizontal: 3,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    productPerfContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    productPerfRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: '#F0F0F0',
    },
    productPerfInfo: {
        flex: 1,
    },
    productPerfCategory: {
        fontSize: 8,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    productPerfName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 1,
    },
    productPerfBadge: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    productPerfBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    emptyPerfBox: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyPerfText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});