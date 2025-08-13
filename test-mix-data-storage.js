// Test script to verify mix data storage in database
import { pool } from './server/config/database.cjs';

async function testMixDataStorage() {
  try {
    console.log('🧪 [TEST] Starting mix data storage test...');
    
    // Test data structure similar to what frontend sends
    const testMixItem = {
      id: 'mix-123',
      name: 'Mix 123',
      price: 500,
      quantity: 1,
      isMix: true,
      source: 'mix-calculator',
      custom_details: {
        mixItems: [
          {
            id: 1,
            name: 'Turmeric Powder',
            price: 200,
            calculatedQuantity: 0.25,
            unit: 'kg',
            actualCost: 200
          },
          {
            id: 2,
            name: 'Red Chili Powder',
            price: 300,
            calculatedQuantity: 0.167,
            unit: 'kg',
            actualCost: 300
          }
        ],
        totalBudget: 500,
        itemCount: 2,
        totalWeight: 0.417,
        mixNumber: 123
      },
      displayName: 'Mix 123 (2 items mix)',
      unit: 'mix',
      totalWeight: 0.417,
      mixNumber: 123
    };

    console.log('🧪 [TEST] Test mix item data:', JSON.stringify(testMixItem, null, 2));

    // Test JSON serialization
    const customDetailsJson = JSON.stringify(testMixItem.custom_details);
    console.log('🧪 [TEST] JSON serialization result:', customDetailsJson);
    console.log('🧪 [TEST] JSON length:', customDetailsJson.length);

    // Test database insertion
    const connection = await pool.getConnection();
    
    // Clean up any existing test data
    await connection.execute('DELETE FROM order_items WHERE product_name = ?', ['Mix 123']);
    
    // Insert test data
    const [result] = await connection.execute(`
      INSERT INTO order_items (
        order_id, product_id, product_name, quantity, unit,
        unit_price, total_price, source, mix_number, is_custom, custom_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      1, // test order_id
      null, // product_id (null for mix items)
      testMixItem.name,
      testMixItem.quantity,
      testMixItem.unit,
      testMixItem.price,
      testMixItem.price * testMixItem.quantity,
      testMixItem.source,
      testMixItem.mixNumber,
      false, // is_custom
      customDetailsJson
    ]);

    console.log('🧪 [TEST] Inserted test item with ID:', result.insertId);

    // Retrieve and verify the stored data
    const [retrievedItems] = await connection.execute(`
      SELECT id, product_name, custom_details FROM order_items WHERE id = ?
    `, [result.insertId]);

    const retrievedItem = retrievedItems[0];
    console.log('🧪 [TEST] Retrieved item data:');
    console.log('  ID:', retrievedItem.id);
    console.log('  Product Name:', retrievedItem.product_name);
    console.log('  Custom Details (raw):', retrievedItem.custom_details);

    // Parse the JSON to verify it's intact
    if (retrievedItem.custom_details) {
      try {
        const parsedDetails = JSON.parse(retrievedItem.custom_details);
        console.log('🧪 [TEST] Parsed custom details:', JSON.stringify(parsedDetails, null, 2));
        
        // Verify the data integrity
        const hasMixItems = Array.isArray(parsedDetails.mixItems) && parsedDetails.mixItems.length > 0;
        const hasCorrectBudget = parsedDetails.totalBudget === 500;
        const hasCorrectItemCount = parsedDetails.itemCount === 2;
        const hasCorrectWeight = parsedDetails.totalWeight === 0.417;
        
        console.log('🧪 [TEST] Data integrity checks:');
        console.log('  Has mix items:', hasMixItems);
        console.log('  Correct budget:', hasCorrectBudget);
        console.log('  Correct item count:', hasCorrectItemCount);
        console.log('  Correct total weight:', hasCorrectWeight);
        
        if (hasMixItems && hasCorrectBudget && hasCorrectItemCount && hasCorrectWeight) {
          console.log('✅ [TEST] All data integrity checks passed!');
        } else {
          console.log('❌ [TEST] Some data integrity checks failed!');
        }
        
      } catch (parseError) {
        console.log('❌ [TEST] Failed to parse custom_details JSON:', parseError.message);
      }
    } else {
      console.log('❌ [TEST] No custom_details found in retrieved item!');
    }

    connection.release();
    console.log('🧪 [TEST] Test completed successfully!');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testMixDataStorage();