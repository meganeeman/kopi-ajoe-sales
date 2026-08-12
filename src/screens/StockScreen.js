import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS } from '../constants/theme';

export default function StockScreen() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [requestQty, setRequestQty] = useState('');

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cart_stocks')
                .select(`
                    id,
                    quantity,
                    products (
                        id,
                        name,
                        category
                    )
                `);

            if (error) throw error;

            const formattedStocks = (data || []).map((item) => ({
                id: item.id,
                stock_quantity: item.quantity || 0,
                product_id: item.products?.id,
                product_name: item.products?.name || 'Produk Kopi Ajoe',
                category: item.products?.category || 'PRODUK',
            }));

            setStocks(formattedStocks);
        } catch (error) {
            Alert.alert('Error', 'Gagal mengambil data stok dari server.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenMainRequestModal = () => {
        if (stocks.length > 0) {
            setSelectedProduct(stocks[0]);
        }
        setRequestQty('');
        setModalVisible(true);
    };

    const handleSendRequest = async () => {
        if (!selectedProduct) {
            Alert.alert('Peringatan', 'Pilih produk terlebih dahulu!');
            return;
        }

        if (!requestQty || isNaN(requestQty) || parseInt(requestQty) <= 0) {
            Alert.alert('Peringatan', 'Masukkan jumlah stok yang valid!');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('stock_requests').insert([
                {
                    sales_id: user?.id,
                    product_id: selectedProduct.product_id || selectedProduct.id,
                    product_name: selectedProduct.product_name,
                    quantity: parseInt(requestQty),
                    status: 'pending',
                },
            ]);

            if (error) throw error;

            Alert.alert('Berhasil', 'Permintaan stok berhasil dikirim ke Manajemen!');
            setModalVisible(false);
        } catch (error) {
            Alert.alert('Gagal', 'Terjadi kesalahan saat mengirim request stok.');
        }
    };

    const renderStockCard = ({ item }) => (
        <View style={styles.gridCard}>
            <Text style={styles.categoryText}>{item.category || 'PRODUK'}</Text>
            <Text style={styles.productName} numberOfLines={1}>
                {item.product_name}
            </Text>
            <View style={styles.stockBadge}>
                <Text style={styles.stockLabel}>Sisa Stok</Text>
                <Text style={styles.stockValue}>{item.stock_quantity}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>STOK GEROBAK</Text>
                <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchStocks}>
                    <Text style={styles.refreshIcon}>↻</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionHeader}>
                <TouchableOpacity
                    style={styles.mainRequestBtn}
                    onPress={handleOpenMainRequestModal}
                >
                    <Text style={styles.mainRequestBtnText}>+ REQUEST STOK CABANG</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={stocks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderStockCard}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Request Stok Cabang</Text>
                        <Text style={styles.modalSubtitle}>Pilih Produk Kopi Ajoe</Text>

                        <View style={styles.productPickerContainer}>
                            <FlatList
                                data={stocks}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => {
                                    const isSelected = selectedProduct?.id === item.id;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.pickerChip,
                                                isSelected && styles.pickerChipSelected,
                                            ]}
                                            onPress={() => setSelectedProduct(item)}
                                        >
                                            <Text
                                                style={[
                                                    styles.pickerChipText,
                                                    isSelected && styles.pickerChipTextSelected,
                                                ]}
                                            >
                                                {item.product_name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Jumlah Cup Ditambah"
                            keyboardType="number-pad"
                            value={requestQty}
                            onChangeText={setRequestQty}
                        />

                        <TouchableOpacity
                            style={styles.sendBtn}
                            onPress={handleSendRequest}
                        >
                            <Text style={styles.sendBtnText}>KIRIM PERMINTAAN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelBtnText}>Batal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
    refreshIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshIcon: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    actionHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
    },
    mainRequestBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    mainRequestBtnText: {
        color: COLORS.secondary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 12 },
    gridCard: {
        width: '48%',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: 'bold', textTransform: 'uppercase' },
    productName: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 2, marginBottom: 10 },
    stockBadge: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    stockLabel: { fontSize: 10, color: COLORS.textSecondary },
    stockValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    modalSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 12 },
    productPickerContainer: {
        height: 40,
        marginBottom: 12,
        width: '100%',
    },
    pickerChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
        backgroundColor: COLORS.card,
    },
    pickerChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    pickerChipText: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    pickerChipTextSelected: {
        color: COLORS.secondary,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
    },
    sendBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    sendBtnText: { color: COLORS.secondary, fontWeight: 'bold', fontSize: 13 },
    cancelBtn: { marginTop: 12 },
    cancelBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: 'bold' },
});