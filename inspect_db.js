import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uluxycppxlzdskyklgqt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Connecting to Supabase at:', supabaseUrl);

  // 1. Check sales table
  console.log('\nChecking "sales" table...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id,customer');
  
  if (salesError) {
    console.error('Error fetching sales:', salesError);
  } else {
    console.log(`Total sales fetched: ${sales.length}`);
    const guestSales = sales.filter(s => s.customer && s.customer.name === 'Khách vãng lai');
    console.log(`Found ${guestSales.length} sales with customer name "Khách vãng lai"`);
    
    if (guestSales.length > 0) {
      console.log('Updating guest sales to "Người tiêu dùng"...');
      let updatedCount = 0;
      for (const sale of guestSales) {
        const updatedCustomer = { ...sale.customer, name: 'Người tiêu dùng' };
        const { error: updateError } = await supabase
          .from('sales')
          .update({ customer: updatedCustomer })
          .eq('id', sale.id);
        
        if (updateError) {
          console.error(`Failed to update sale ${sale.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      console.log(`Successfully updated ${updatedCount} sales.`);
    }
  }

  // 2. Check work_orders table
  console.log('\nChecking "work_orders" table...');
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id,customername');
  
  if (woError) {
    console.error('Error fetching work_orders:', woError);
  } else {
    console.log(`Total work orders fetched: ${workOrders.length}`);
    const guestWOs = workOrders.filter(w => w.customername === 'Khách vãng lai');
    console.log(`Found ${guestWOs.length} work orders with customername "Khách vãng lai"`);
    
    if (guestWOs.length > 0) {
      console.log('Updating guest work orders to "Người tiêu dùng"...');
      let updatedCount = 0;
      for (const wo of guestWOs) {
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({ customername: 'Người tiêu dùng' })
          .eq('id', wo.id);
        
        if (updateError) {
          console.error(`Failed to update work order ${wo.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      console.log(`Successfully updated ${updatedCount} work orders.`);
    }
  }

  // 3. Check customer_debts table
  console.log('\nChecking "customer_debts" table...');
  const { data: customerDebts, error: debtError } = await supabase
    .from('customer_debts')
    .select('id,customerName');
  
  if (debtError) {
    console.error('Error fetching customer_debts:', debtError);
  } else {
    console.log(`Total customer debts fetched: ${customerDebts.length}`);
    const guestDebts = customerDebts.filter(d => d.customerName === 'Khách vãng lai');
    console.log(`Found ${guestDebts.length} customer debts with customerName "Khách vãng lai"`);
    
    if (guestDebts.length > 0) {
      console.log('Updating guest customer debts to "Người tiêu dùng"...');
      let updatedCount = 0;
      for (const debt of guestDebts) {
        const { error: updateError } = await supabase
          .from('customer_debts')
          .update({ customerName: 'Người tiêu dùng' })
          .eq('id', debt.id);
        
        if (updateError) {
          console.error(`Failed to update customer debt ${debt.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      console.log(`Successfully updated ${updatedCount} customer debts.`);
    }
  }

  console.log('\nDone!');
}

run();
