import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uluxycppxlzdskyklgqt.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNTkzMiwiZXhwIjoyMDc4MDgxOTMyfQ.dJ--iUVVw5rPbn9fjErGV-681fwUOnfz8Ut7OluO8Ws";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log("🔄 Bắt đầu backfill wholesalePrice (Giá sỉ) cho phụ tùng...\n");

    let allParts = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from("parts").select("*").range(from, from + 999);
        if (error || !data || data.length === 0) break;
        allParts = allParts.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }

    console.log(`📋 Đã tải ${allParts.length} phụ tùng hiện có \n`);

    const updates = [];
    const branchId = "CN1";
    const WHOLESALE_MARKUP = 1.25;

    for (const part of allParts) {
        const costPriceObj = part.costprice || part.costPrice;
        const wholesalePriceObj = part.wholesaleprice || part.wholesalePrice || part.wholesale_price;

        const cost = costPriceObj?.[branchId] || 0;
        const wholesale = wholesalePriceObj?.[branchId] || 0;

        if (cost > 0 && wholesale === 0) {
            const calculatedWholesale = Math.round(cost * WHOLESALE_MARKUP);

            const isCamelDB = 'wholesalePrice' in part;
            const updateField = isCamelDB ? 'wholesalePrice' : 'wholesaleprice';

            updates.push({
                id: part.id,
                [updateField]: {
                    ...(wholesalePriceObj || {}),
                    [branchId]: calculatedWholesale,
                },
                partName: part.name,
                cost: cost
            });
        }
    }

    console.log(`\n💰 Cần cập nhật giá sỉ cho ${updates.length} phụ tùng...`);

    if (updates.length > 0) {
        for (const update of updates) {
            const updateObj = { [update.wholesalePrice ? 'wholesalePrice' : 'wholesaleprice']: update.wholesalePrice || update.wholesaleprice };
            if ('wholesalePrice' in update) {
                updateObj.wholesalePrice = update.wholesalePrice;
            } else if ('wholesaleprice' in update) {
                updateObj.wholesaleprice = update.wholesaleprice;
            } else {
                // Determine update field
                const fieldName = Object.keys(update).find(k => k === 'wholesalePrice' || k === 'wholesaleprice');
                if (fieldName) updateObj[fieldName] = update[fieldName];
            }

            console.log(`  - Cập nhật: ${update.partName} | Giá nhập: ${update.cost} -> Giá sỉ: ${updateObj.wholesalePrice?.[branchId] || updateObj.wholesaleprice?.[branchId]}`);

            const { error: updateErr, data } = await supabase
                .from("parts")
                .update(updateObj)
                .eq("id", update.id)
                .select();

            if (updateErr) {
                console.error(`❌ Lỗi cập nhật part ${update.id}:`, updateErr);
            } else if (!data || data.length === 0) {
                console.error(`❌ Không update được (0 rows affected): ${update.id}`);
            }
        }
        console.log(`✅ Đã cập nhật xong ${updates.length} phụ tùng!`);
    } else {
        console.log(`✅ Kho không có phụ tùng nào thiếu giá sỉ cần cập nhật!`);
    }
}

main().catch(console.error);
