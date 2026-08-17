import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import { PRODUCT_IMAGES } from '../constants/images';
import { COLORS } from '../constants/theme';
import { salesService } from '../services/salesServices';
import { useOtaUpdate } from '../utils/useOtaUpdate';

export default function HomeScreen() {
    useOtaUpdate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState({});
    const [isOpen, setIsOpen] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');

    const locationSubscription = useRef(null);
    const currentCartUnitId = useRef(null);

    useEffect(() => {
        fetchProducts();

        return () => {
            stopLocationTracking();
        };
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            Alert.alert('Error', 'Gagal mengambil data produk dari server.');
        } finally {
            setLoading(false);
        }
    };

    const toggleLapakStatus = async (value) => {
        if (value) {
            const started = await startLocationTracking();
            if (started) {
                setIsOpen(true);
            }
        } else {
            await stopLocationTracking();
            setIsOpen(false);
        }
    };

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Izin Lokasi Ditolak',
                    'Aplikasi membutuhkan izin lokasi untuk mengaktifkan status Lapak Buka.'
                );
                return false;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            let { data: unitData } = await supabase
                .from('cart_units')
                .select('id')
                .eq('active_sales_id', user.id)
                .maybeSingle();

            if (!unitData) {
                const { data: availableUnit } = await supabase
                    .from('cart_units')
                    .select('id')
                    .is('active_sales_id', null)
                    .limit(1)
                    .maybeSingle();

                if (availableUnit) {
                    await supabase
                        .from('cart_units')
                        .update({ active_sales_id: user.id })
                        .eq('id', availableUnit.id);
                    unitData = availableUnit;
                } else {
                    const { data: anyUnit } = await supabase
                        .from('cart_units')
                        .select('id')
                        .limit(1)
                        .maybeSingle();

                    if (anyUnit) {
                        await supabase
                            .from('cart_units')
                            .update({ active_sales_id: user.id })
                            .eq('id', anyUnit.id);
                        unitData = anyUnit;
                    }
                }
            }

            if (!unitData) {
                Alert.alert('Gagal', 'Tidak ada unit gerobak yang tersedia di database.');
                return false;
            }

            currentCartUnitId.current = unitData.id;

            const initialLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            if (initialLocation) {
                await supabase
                    .from('cart_units')
                    .update({
                        latitude: initialLocation.coords.latitude,
                        longitude: initialLocation.coords.longitude,
                        is_open: true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', unitData.id);
            }

            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000,
                    distanceInterval: 10,
                },
                async (location) => {
                    const { latitude, longitude } = location.coords;

                    await supabase
                        .from('cart_units')
                        .update({
                            latitude: latitude,
                            longitude: longitude,
                            is_open: true,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', unitData.id);
                }
            );

            return true;
        } catch (error) {
            Alert.alert('Error GPS', 'Gagal mengaktifkan pelacakan lokasi.');
            return false;
        }
    };

    const stopLocationTracking = async () => {
        try {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (currentCartUnitId.current) {
                await supabase
                    .from('cart_units')
                    .update({
                        is_open: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', currentCartUnitId.current);
            } else if (user) {
                await supabase
                    .from('cart_units')
                    .update({
                        is_open: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('active_sales_id', user.id);
            }
        } catch (error) {
            console.log('Error stopping tracking:', error);
        }
    };

    const handleAddToCart = (product) => {
        setCart((prevCart) => {
            const currentQty = prevCart[product.id]?.quantity || 0;
            return {
                ...prevCart,
                [product.id]: {
                    ...product,
                    quantity: currentQty + 1,
                },
            };
        });
    };

    const handleRemoveFromCart = (productId) => {
        setCart((prevCart) => {
            const currentQty = prevCart[productId]?.quantity || 0;
            if (currentQty <= 1) {
                const newCart = { ...prevCart };
                delete newCart[productId];
                return newCart;
            }
            return {
                ...prevCart,
                [productId]: {
                    ...prevCart[productId],
                    quantity: currentQty - 1,
                },
            };
        });
    };

    const getTotalPrice = () => {
        return Object.values(cart).reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
    };

    const getTotalCups = () => {
        return Object.values(cart).reduce(
            (sum, item) => sum + item.quantity,
            0
        );
    };

    const handleCheckout = () => {
        if (getTotalCups() === 0) {
            Alert.alert('Keranjang Kosong', 'Pilih minimal 1 produk!');
            return;
        }
        setPaymentModalVisible(true);
    };

    const handleConfirmPayment = (method) => {
        setSelectedPayment(method);
        setPaymentModalVisible(false);
        setMemberModalVisible(true);
    };

    const handleMemberScan = (isMember) => {
        setMemberModalVisible(false);
        if (isMember) {
            Alert.alert(
                'Scan QR Member',
                'Buka kamera untuk scan QR Member customer...',
                [
                    {
                        text: 'Simulasi Scan Berhasil',
                        onPress: () => processTransaction(true),
                    },
                ]
            );
        } else {
            processTransaction(false);
        }
    };

    const processTransaction = async (isMember, customerId = null) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const totalPrice = getTotalPrice();
            const totalCups = getTotalCups();

            let cartUnitId = null;
            let commissionPerCup = 1000;

            if (user) {
                const { data: unitData } = await supabase
                    .from('cart_units')
                    .select('id, commission_per_cup, vehicle_type')
                    .eq('active_sales_id', user.id)
                    .maybeSingle();

                if (unitData) {
                    cartUnitId = unitData.id;
                    commissionPerCup = unitData.commission_per_cup || (unitData.vehicle_type === 'sepeda' ? 1000 : 1200);
                }
            }

            const commissionEarned = totalCups * commissionPerCup;
            const pointsEarned = isMember ? totalCups : 0;
            const cartItems = Object.values(cart);

            const result = await salesService.createTransaction({
                cartUnitId: cartUnitId,
                salesId: user?.id,
                customerId: customerId,
                totalPrice,
                totalCups,
                commissionEarned,
                pointsEarned,
                cartItems: cartItems,
            });

            if (result.success) {
                Alert.alert(
                    'Transaksi Sukses!',
                    `Pembayaran via ${selectedPayment} sebesar Rp ${totalPrice.toLocaleString('id-ID')} berhasil disimpan.${isMember ? ' Poin member telah ditambahkan.' : ''
                    }`
                );
                setCart({});
            } else {
                Alert.alert('Gagal Transaksi', result.error);
            }
        } catch (error) {
            Alert.alert('Gagal', 'Terjadi kesalahan saat memproses transaksi.');
        }
    };

    const renderProductItem = ({ item }) => {
        const qty = cart[item.id]?.quantity || 0;

        const imgKey = item.image_url ? item.image_url.trim().toUpperCase() : 'STRONG';
        const rawSource = PRODUCT_IMAGES[imgKey] || PRODUCT_IMAGES['STRONG'];
        const imageSource = typeof rawSource === 'string' ? { uri: rawSource } : rawSource;

        return (
            <View style={styles.gridCard}>
                <Image
                    source={imageSource}
                    style={styles.gridImage}
                    resizeMode="cover"
                />
                <Text style={styles.gridCategory}>{item.category || 'COFFEE'}</Text>
                <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.gridPrice}>
                    Rp {item.price.toLocaleString('id-ID')}
                </Text>

                <View style={styles.gridActionRow}>
                    {qty > 0 ? (
                        <View style={styles.qtyContainer}>
                            <TouchableOpacity
                                style={styles.qtyBtnMinus}
                                onPress={() => handleRemoveFromCart(item.id)}
                            >
                                <Text style={styles.qtyBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <TouchableOpacity
                                style={styles.qtyBtnPlus}
                                onPress={() => handleAddToCart(item)}
                            >
                                <Text style={styles.qtyBtnTextPlus}>+</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => handleAddToCart(item)}
                        >
                            <Text style={styles.addBtnText}>+ Tambah</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const totalCups = getTotalCups();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent />

            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>KASIR KOPI AJOE</Text>
                    <Text style={styles.statusSubtext}>
                        {isOpen ? 'Lapak Buka (GPS Active)' : 'Lapak Tutup (GPS Off)'}
                    </Text>
                </View>
                <View style={styles.toggleWrapper}>
                    <Switch
                        trackColor={{ false: '#E0E0E0', true: '#000000' }}
                        thumbColor={isOpen ? '#FFFFFF' : '#9E9E9E'}
                        onValueChange={toggleLapakStatus}
                        value={isOpen}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProductItem}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {totalCups > 0 && (
                <View style={styles.flyingCartWrapper}>
                    <TouchableOpacity
                        style={styles.flyingCart}
                        activeOpacity={0.9}
                        onPress={handleCheckout}
                    >
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{totalCups}</Text>
                        </View>
                        <View style={styles.cartInfo}>
                            <Text style={styles.cartItemsText}>{totalCups} Cup Dipilih</Text>
                            <Text style={styles.cartPriceText}>
                                Rp {getTotalPrice().toLocaleString('id-ID')}
                            </Text>
                        </View>
                        <View style={styles.checkoutAction}>
                            <Text style={styles.checkoutActionText}>BAYAR ›</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={paymentModalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Metode Pembayaran</Text>
                        <Text style={styles.modalSubtitle}>
                            Total: Rp {getTotalPrice().toLocaleString('id-ID')}
                        </Text>

                        <TouchableOpacity
                            style={styles.paymentOptionBtn}
                            onPress={() => handleConfirmPayment('CASH')}
                        >
                            <Text style={styles.paymentOptionText}>TUNAI / CASH</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.paymentOptionBtn}
                            onPress={() => handleConfirmPayment('QRIS')}
                        >
                            <Text style={styles.paymentOptionText}>QRIS STATIS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setPaymentModalVisible(false)}
                        >
                            <Text style={styles.cancelBtnText}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={memberModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Member Kopi Ajoe</Text>
                        <Text style={styles.modalSubtitle}>
                            Apakah pembeli memiliki QR Code Member?
                        </Text>

                        <TouchableOpacity
                            style={styles.paymentOptionBtn}
                            onPress={() => handleMemberScan(true)}
                        >
                            <Text style={styles.paymentOptionText}>YA (SCAN QR)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOptionBtn,
                                { backgroundColor: '#F5F5F5' },
                            ]}
                            onPress={() => handleMemberScan(false)}
                        >
                            <Text
                                style={[
                                    styles.paymentOptionText,
                                    { color: COLORS.textPrimary },
                                ]}
                            >
                                TIDAK (NON MEMBER)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    statusSubtext: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    toggleWrapper: {
        marginLeft: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 12,
        paddingBottom: 160,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    gridCard: {
        width: '48%',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    gridImage: {
        width: '100%',
        height: 110,
        borderRadius: 10,
        marginBottom: 6,
    },
    gridCategory: {
        fontSize: 8,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
    },
    gridName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: 2,
        alignSelf: 'flex-start',
        width: '100%',
    },
    gridPrice: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
        alignSelf: 'flex-start',
        fontWeight: '600',
    },
    gridActionRow: {
        width: '100%',
        marginTop: 8,
    },
    addBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
    },
    addBtnText: {
        color: COLORS.secondary,
        fontSize: 11,
        fontWeight: 'bold',
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 2,
    },
    qtyBtnMinus: {
        width: 26,
        height: 26,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.card,
    },
    qtyBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    qtyText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    qtyBtnPlus: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnTextPlus: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    flyingCartWrapper: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
    flyingCart: {
        backgroundColor: '#000000',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    cartBadge: {
        backgroundColor: '#FFFFFF',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cartBadgeText: {
        color: '#000000',
        fontWeight: 'bold',
        fontSize: 13,
    },
    cartInfo: {
        flex: 1,
    },
    cartItemsText: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '600',
    },
    cartPriceText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    checkoutAction: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    checkoutActionText: {
        color: '#000000',
        fontWeight: 'bold',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginVertical: 12,
        textAlign: 'center',
    },
    paymentOptionBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    paymentOptionText: {
        color: COLORS.secondary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
    cancelBtn: {
        marginTop: 14,
    },
    cancelBtnText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: 'bold',
    },
});