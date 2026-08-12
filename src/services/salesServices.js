import { supabase } from '../config/supabase';

export const salesService = {
    async createTransaction({ cartUnitId, salesId, customerId, totalPrice, totalCups, commissionEarned, pointsEarned, cartItems }) {
        try {
            const { data: transactionData, error: transError } = await supabase
                .from('transactions')
                .insert([
                    {
                        cart_unit_id: cartUnitId,
                        sales_id: salesId,
                        customer_id: customerId,
                        total_price: totalPrice,
                        total_cups: totalCups,
                        commission_earned: commissionEarned,
                        points_earned: pointsEarned,
                        payment_status: 'success',
                        items: cartItems || [],
                    },
                ])
                .select()
                .single();

            if (transError) throw transError;

            if (cartItems && cartItems.length > 0) {
                for (const item of cartItems) {
                    let query = supabase.from('cart_stocks').select('id, quantity');
                    
                    if (cartUnitId) {
                        query = query.eq('cart_unit_id', cartUnitId).eq('product_id', item.id);
                    } else {
                        query = query.eq('product_id', item.id);
                    }

                    const { data: stockData } = await query.limit(1).maybeSingle();

                    if (stockData) {
                        const newQty = Math.max(0, stockData.quantity - item.quantity);
                        await supabase
                            .from('cart_stocks')
                            .update({ quantity: newQty, updated_at: new Date() })
                            .eq('id', stockData.id);
                    }
                }
            }

            return { success: true, data: transactionData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
};