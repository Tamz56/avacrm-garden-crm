// src/components/customers/deals/DealDetailDemo.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import DealDetailPage from './DealDetailPage';
import type { Deal } from '../../../types/crm';

type Props = {
  dealId?: string | null;
};

const DealDetailDemo: React.FC<Props> = ({ dealId }) => {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDeal = async () => {
      setLoading(true);
      setError(null);

      let query = supabase.from('deals').select('*');

      // ถ้ามี dealId → filter ตาม id นั้น
      if (dealId) {
        query = query.eq('id', dealId).limit(1);
      } else {
        // ถ้าไม่มี → เอาดีลตัวแรกไว้ทดสอบ
        query = query.limit(1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase loadDeal error:', error);
        setError(error.message);
      } else if (data && data.length > 0) {
        setDeal(data[0] as Deal);
      } else {
        setError('ไม่พบข้อมูลดีลในตาราง deals');
      }

      setLoading(false);
    };

    loadDeal();
  }, [dealId]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-lg font-semibold mb-2">Deal Detail Demo</h1>
        <p className="text-sm text-slate-500">
          กำลังโหลดข้อมูลดีลจาก Supabase...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-lg font-semibold mb-2">Deal Detail Demo</h1>
        <p className="text-sm text-rose-600">เกิดข้อผิดพลาด: {error}</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-lg font-semibold mb-2">Deal Detail Demo</h1>
        <p className="text-sm text-slate-500">ไม่พบดีลสำหรับทดสอบ</p>
      </div>
    );
  }

  return (
    <div className="p-0 md:p-0">
  <DealDetailPage dealId={deal.id} />
</div>
  );
};

export default DealDetailDemo;
