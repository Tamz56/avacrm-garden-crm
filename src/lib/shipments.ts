import { supabase } from '../supabaseClient';
import type { ShipmentStatus } from '../types/shipment';

export async function updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus
) {
    const { data, error } = await supabase
        .from('deal_shipments')
        .update({ status })
        .eq('id', shipmentId)
        .select('id, status')
        .single();

    if (error) {
        console.error('updateShipmentStatus error', error);
        throw error;
    }

    return data;
}
